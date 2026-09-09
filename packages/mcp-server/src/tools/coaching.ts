import type {
  ExerciseHistoryEntry,
  ExerciseTemplate,
  HevyClient,
  Workout,
} from "@furkantanyol/hevy-client";
import { MAX_PAGE_SIZE } from "@furkantanyol/hevy-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonResponse, safe, textResponse } from "../utils/response.js";
import { exerciseTemplateId } from "./schemas.js";

const MAX_SUMMARY_WORKOUTS = 50;
const MAX_PROGRESSION_SESSIONS = 20;
const TOP_EXERCISES = 15;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_WEEK = 7;
const EPLEY_DIVISOR = 30;
const LIBRARY_CACHE_TTL_MS = 5 * MS_PER_MINUTE;

// RPE thresholds from the adaptation rules in prompts/COACH.md.
const RPE_INCREASE = 7;
const RPE_HOLD = 8;
const RPE_DECREASE = 9.5;

const round1 = (n: number) => Math.round(n * 10) / 10;
const epley1RM = (weightKg: number, reps: number) => weightKg * (1 + reps / EPLEY_DIVISOR);
const isWorking = (set: { type: string }) => set.type !== "warmup";

export function registerCoachingTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "analyze-workout",
    {
      description: `Compare a completed workout with the planned session and get per-exercise adaptation recommendations
(increase_weight / maintain_then_increase / hold_weight / decrease_weight) based on reps hit and average RPE.
Call after each workout to drive progressive overload. Exercise names must match Hevy titles.`,
      inputSchema: {
        workoutId: z.string().min(1).describe("Id of the completed workout"),
        plannedExercises: z
          .array(
            z.object({
              name: z.string().describe("Exercise title exactly as in Hevy"),
              targetSets: z.number().int(),
              targetReps: z.number().int(),
              targetWeightKg: z.number().nullable(),
              targetRpe: z.number().nullable(),
            }),
          )
          .describe("The planned exercises for this session"),
      },
    },
    safe(async ({ workoutId, plannedExercises }) =>
      jsonResponse(
        analyzeWorkoutPerformance(await client.workouts.get(workoutId), plannedExercises),
      ),
    ),
  );

  server.registerTool(
    "get-training-summary",
    {
      description: `Aggregate the last N workouts: sessions, working sets, average duration, days between sessions,
sessions per week and the most frequent exercises with set counts. Use for weekly reviews and volume checks.`,
      inputSchema: {
        workoutCount: z.coerce
          .number()
          .int()
          .gte(1)
          .lte(MAX_SUMMARY_WORKOUTS)
          .default(10)
          .describe("How many recent workouts to include"),
      },
    },
    safe(async ({ workoutCount }) => {
      const workouts = await recentWorkouts(client, workoutCount);
      return workouts.length
        ? jsonResponse(generateTrainingSummary(workouts))
        : textResponse("No workouts found.");
    }),
  );

  server.registerTool(
    "get-exercise-progression",
    {
      description: `Session-by-session progression for one exercise: max weight, max reps, volume, estimated 1RM (Epley),
best set, all-time best and trend (improving / plateau / declining). Use to spot PRs and plateaus.`,
      inputSchema: {
        exerciseTemplateId,
        sessions: z.coerce
          .number()
          .int()
          .gte(1)
          .lte(MAX_PROGRESSION_SESSIONS)
          .default(10)
          .describe("Most recent sessions to include"),
      },
    },
    safe(async ({ exerciseTemplateId, sessions }) => {
      const history = await client.exerciseHistory.get(exerciseTemplateId);
      if (!history.length) return textResponse("No history found for this exercise.");
      return jsonResponse(analyzeExerciseProgression(history, sessions));
    }),
  );

  server.registerTool(
    "find-exercise",
    {
      description:
        "Search the exercise library by name or muscle group and get id + title for every match, shortest title first. For 2+ names use batch-find-exercises.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Exercise name or muscle group, e.g. 'incline press' or 'hamstrings'"),
      },
    },
    safe(async ({ query }) => {
      const matches = searchExercises(await loadLibrary(client), query);
      if (!matches.length) return textResponse(`No exercises found matching "${query}".`);
      return jsonResponse({ query, matches: matches.length, exercises: matches });
    }),
  );

  server.registerTool(
    "batch-find-exercises",
    {
      description: `Resolve many exercise names to Hevy template ids in ONE call. Exact title match wins, otherwise the shortest title containing the query.
Returns {found, total, missing, results: {name: {id, title} | null}}. Always use this before create-routine or create-workout.`,
      inputSchema: {
        queries: z.array(z.string().min(1)).min(1).describe("Exercise names to look up"),
      },
    },
    safe(async ({ queries }) => {
      const library = await loadLibrary(client);
      const results = Object.fromEntries(queries.map((q) => [q, findBestMatch(library, q)]));
      const missing = queries.filter((q) => !results[q]);
      return jsonResponse({
        found: queries.length - missing.length,
        total: queries.length,
        missing,
        results,
      });
    }),
  );
}

// --- Exercise library -------------------------------------------------------

type Match = { id: string; title: string };

// ponytail: one process serves one API key, so a module-level cache is enough.
let libraryCache: { expires: number; templates: ExerciseTemplate[] } | undefined;

async function loadLibrary(client: HevyClient): Promise<ExerciseTemplate[]> {
  if (libraryCache && libraryCache.expires > Date.now()) return libraryCache.templates;
  const templates = await client.exerciseTemplates.listAll();
  libraryCache = { expires: Date.now() + LIBRARY_CACHE_TTL_MS, templates };
  return templates;
}

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
const byTitleLength = (a: Match, b: Match) => a.title.length - b.title.length;

/** Exact normalised title match first; otherwise the shortest title containing the query. */
export function findBestMatch(library: Match[], query: string): Match | null {
  const q = normalise(query);
  const exact = library.find((t) => normalise(t.title) === q);
  if (exact) return { id: exact.id, title: exact.title };
  const partial = library.filter((t) => normalise(t.title).includes(q)).sort(byTitleLength)[0];
  return partial ? { id: partial.id, title: partial.title } : null;
}

function searchExercises(library: ExerciseTemplate[], query: string): Match[] {
  const q = normalise(query);
  return library
    .filter(
      (t) =>
        normalise(t.title).includes(q) ||
        t.primary_muscle_group.includes(q) ||
        t.secondary_muscle_groups.some((m) => m.includes(q)),
    )
    .sort(byTitleLength)
    .map((t) => ({ id: t.id, title: t.title }));
}

// --- Analysis ---------------------------------------------------------------

async function recentWorkouts(client: HevyClient, count: number): Promise<Workout[]> {
  const workouts: Workout[] = [];
  for (let page = 1; workouts.length < count; page++) {
    const result = await client.workouts.list({ page, pageSize: MAX_PAGE_SIZE });
    workouts.push(...result.workouts);
    if (page >= result.page_count) break;
  }
  return workouts.slice(0, count);
}

interface PlannedExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  targetRpe: number | null;
}

function recommend(
  plan: PlannedExercise | undefined,
  repsPerSet: number,
  sets: number,
  avgRpe: number | null,
) {
  if (!plan) return "maintain";
  const hitReps = repsPerSet >= plan.targetReps;
  const hitSets = sets >= plan.targetSets;
  if (hitReps && hitSets && avgRpe !== null && avgRpe <= RPE_INCREASE) return "increase_weight";
  if (hitReps && hitSets && avgRpe !== null && avgRpe <= RPE_HOLD) return "maintain_then_increase";
  if (!hitReps && avgRpe !== null && avgRpe >= RPE_DECREASE) return "decrease_weight";
  if (!hitReps) return "hold_weight";
  return "maintain";
}

function analyzeWorkoutPerformance(workout: Workout, planned: PlannedExercise[]) {
  const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  const exerciseResults = workout.exercises.map((actual) => {
    const plan = planned.find((p) => sameName(p.name, actual.title));
    const workingSets = actual.sets.filter(isWorking);
    const rated = workingSets.filter((s) => s.rpe !== null);
    const totalReps = workingSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
    const avgRpe = rated.length
      ? rated.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / rated.length
      : null;
    const repsPerSet = workingSets.length ? totalReps / workingSets.length : 0;

    return {
      exercise: actual.title,
      planned: plan
        ? {
            sets: plan.targetSets,
            reps: plan.targetReps,
            weightKg: plan.targetWeightKg,
            rpe: plan.targetRpe,
          }
        : null,
      actual: {
        setsCompleted: workingSets.length,
        avgRepsPerSet: round1(repsPerSet),
        totalReps,
        maxWeightKg: Math.max(0, ...workingSets.map((s) => s.weight_kg ?? 0)),
        avgRpe: avgRpe === null ? null : round1(avgRpe),
      },
      recommendation: recommend(plan, repsPerSet, workingSets.length, avgRpe),
      notes: actual.notes,
    };
  });

  const skipped = planned.filter((p) => !workout.exercises.some((a) => sameName(a.title, p.name)));

  return {
    workoutId: workout.id,
    title: workout.title,
    date: workout.start_time,
    durationMinutes: Math.round(
      (new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) /
        MS_PER_MINUTE,
    ),
    totalWorkingSets: workout.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(isWorking).length,
      0,
    ),
    exerciseResults,
    skippedExercises: skipped.map((e) => e.name),
    overallAdherence: planned.length
      ? Math.round(((planned.length - skipped.length) / planned.length) * 100)
      : 100,
  };
}

function generateTrainingSummary(workouts: Workout[]) {
  const dates = workouts.map((w) => new Date(w.start_time).getTime()).sort((a, b) => a - b);
  const gaps = dates.slice(1).map((t, i) => (t - (dates[i] ?? t)) / MS_PER_DAY);
  const avgDaysBetween = gaps.length ? round1(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
  const durations = workouts.map(
    (w) => (new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / MS_PER_MINUTE,
  );

  const sessionsByExercise = new Map<string, { sessions: number; totalSets: number }>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const entry = sessionsByExercise.get(exercise.title) ?? { sessions: 0, totalSets: 0 };
      entry.sessions++;
      entry.totalSets += exercise.sets.filter(isWorking).length;
      sessionsByExercise.set(exercise.title, entry);
    }
  }
  const topExercises = [...sessionsByExercise.entries()]
    .sort(([, a], [, b]) => b.sessions - a.sessions)
    .slice(0, TOP_EXERCISES)
    .map(([name, stats]) => ({ name, ...stats }));

  const isoDay = (ms: number | undefined) =>
    ms === undefined ? undefined : new Date(ms).toISOString().slice(0, 10);

  return {
    period: { from: isoDay(dates[0]), to: isoDay(dates[dates.length - 1]) },
    totalSessions: workouts.length,
    totalWorkingSets: [...sessionsByExercise.values()].reduce((sum, e) => sum + e.totalSets, 0),
    avgSessionDurationMinutes: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0,
    avgDaysBetweenSessions: avgDaysBetween,
    sessionsPerWeek: avgDaysBetween > 0 ? round1(DAYS_PER_WEEK / avgDaysBetween) : 0,
    topExercises,
  };
}

/** History is flat (one row per set). Group by workout, oldest first, keep the last `limit` sessions. */
export function analyzeExerciseProgression(
  history: ExerciseHistoryEntry[],
  limit = Number.POSITIVE_INFINITY,
) {
  const byWorkout = new Map<string, ExerciseHistoryEntry[]>();
  for (const entry of history) {
    if (entry.set_type === "warmup") continue;
    byWorkout.set(entry.workout_id, [...(byWorkout.get(entry.workout_id) ?? []), entry]);
  }

  const sessions = [...byWorkout.values()]
    .filter((sets): sets is [ExerciseHistoryEntry, ...ExerciseHistoryEntry[]] => sets.length > 0)
    .sort((a, b) => a[0].workout_start_time.localeCompare(b[0].workout_start_time))
    .slice(-limit)
    .map((workingSets) => {
      const bestSet = workingSets.reduce(
        (best, s) => {
          const e1rm = epley1RM(s.weight_kg ?? 0, s.reps ?? 0);
          return e1rm > best.e1rm ? { weight: s.weight_kg ?? 0, reps: s.reps ?? 0, e1rm } : best;
        },
        { weight: 0, reps: 0, e1rm: 0 },
      );
      return {
        date: workingSets[0].workout_start_time.slice(0, 10),
        workingSets: workingSets.length,
        maxWeightKg: Math.max(...workingSets.map((s) => s.weight_kg ?? 0)),
        maxReps: Math.max(...workingSets.map((s) => s.reps ?? 0)),
        totalVolume: Math.round(
          workingSets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
        ),
        estimated1RM: round1(bestSet.e1rm),
        bestSet: { weightKg: bestSet.weight, reps: bestSet.reps },
      };
    });

  const latest1RM = sessions[sessions.length - 1]?.estimated1RM ?? 0;
  const earliest1RM = sessions[0]?.estimated1RM ?? 0;

  return {
    sessionCount: sessions.length,
    sessions,
    allTimeBestE1RM: Math.max(0, ...sessions.map((s) => s.estimated1RM)),
    progressionKg: round1(latest1RM - earliest1RM),
    trend:
      latest1RM > earliest1RM ? "improving" : latest1RM === earliest1RM ? "plateau" : "declining",
  };
}
