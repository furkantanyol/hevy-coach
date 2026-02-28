import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient, HevyWorkout, HevyExerciseHistoryEntry } from "../utils/hevy-client.js";
import { jsonResponse, textResponse, errorResponse, getErrorMessage } from "../utils/response.js";

export function registerCoachingTools(server: McpServer, client: HevyClient) {
  // ─── ANALYZE WORKOUT ──────────────────────────────────────────────
  // The brain: compares a completed workout against the planned session
  // and generates coaching feedback + adaptation recommendations.

  server.registerTool(
    "analyze-workout",
    {
      description: `Analyze a completed workout against a planned session. Compares actual vs planned performance
and generates coaching feedback with adaptation recommendations.

Provide the workout ID to analyze and the planned session details (exercises with target sets/reps/weight/RPE).
Returns: performance summary, progression recommendations, volume analysis, and suggested changes for next session.

This is the core coaching tool — call it after each workout to drive adaptive programming.`,
      inputSchema: {
        workoutId: z.string().min(1).describe("ID of the completed workout to analyze"),
        plannedExercises: z.array(z.object({
          name: z.string().describe("Exercise name as it appears in Hevy"),
          targetSets: z.number().int().describe("Planned number of sets"),
          targetReps: z.number().int().describe("Planned reps per set"),
          targetWeightKg: z.number().nullable().describe("Planned weight in kg (null for bodyweight)"),
          targetRpe: z.number().nullable().describe("Target RPE (1-10, null if not specified)"),
        })).describe("The planned exercises for this session"),
      },
    },
    async ({ workoutId, plannedExercises }) => {
      try {
        const workout = await client.getWorkout(workoutId);
        if (!workout) return textResponse("Workout not found.");

        const analysis = analyzeWorkoutPerformance(workout, plannedExercises);
        return jsonResponse(analysis);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  // ─── GET RECENT SUMMARY ───────────────────────────────────────────
  // Fetches the last N workouts and produces a structured training summary
  // for the coaching brain to reason about.

  server.registerTool(
    "get-training-summary",
    {
      description: `Get a structured summary of recent training. Fetches the last N workouts and produces:
- Total sessions and training days
- Volume per muscle group (total sets)
- Exercise frequency (which exercises, how often)
- Weight progression trends
- Average session duration
- Training consistency (days between sessions)

Use this for weekly reviews, program adjustments, and trend analysis.`,
      inputSchema: {
        workoutCount: z.coerce.number().int().gte(1).lte(50).default(10)
          .describe("Number of recent workouts to analyze (default 10)"),
      },
    },
    async ({ workoutCount }) => {
      try {
        // Fetch workouts in pages of 10
        const allWorkouts: HevyWorkout[] = [];
        let page = 1;
        const pageSize = Math.min(workoutCount, 10);

        while (allWorkouts.length < workoutCount) {
          const result = await client.getWorkouts(page, pageSize);
          if (!result.workouts.length) break;
          allWorkouts.push(...result.workouts);
          if (result.workouts.length < pageSize) break;
          page++;
        }

        const workouts = allWorkouts.slice(0, workoutCount);
        if (!workouts.length) return textResponse("No workouts found.");

        const summary = generateTrainingSummary(workouts);
        return jsonResponse(summary);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  // ─── GET EXERCISE PROGRESSION ─────────────────────────────────────
  // Shows how a specific exercise has progressed over time — weights, reps, estimated 1RM.

  server.registerTool(
    "get-exercise-progression",
    {
      description: `Track progression for a specific exercise over time. Shows:
- Weight progression (session by session)
- Rep progression
- Estimated 1RM trend (Epley formula)
- Best set (highest estimated 1RM)
- Volume trend (total sets × reps × weight per session)

Use this to identify plateaus, track PRs, and inform programming decisions.`,
      inputSchema: {
        exerciseTemplateId: z.string().min(1).describe("Hevy exercise template ID"),
        sessions: z.coerce.number().int().gte(1).lte(20).default(10)
          .describe("Number of recent sessions to analyze (default 10)"),
      },
    },
    async ({ exerciseTemplateId, sessions }) => {
      try {
        const history = await client.getExerciseHistory(exerciseTemplateId, 1, sessions);
        if (!history.exercise_history?.length) {
          return textResponse("No history found for this exercise.");
        }

        const progression = analyzeExerciseProgression(history.exercise_history);
        return jsonResponse(progression);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  // ─── FIND EXERCISE ────────────────────────────────────────────────
  // Search for exercises by name or muscle group — easier than browsing paginated templates.

  server.registerTool(
    "find-exercise",
    {
      description: `Search for exercises by name or muscle group. Returns matching exercise template IDs
that can be used in routines. Searches across all pages of the exercise library.`,
      inputSchema: {
        query: z.string().min(1).describe("Exercise name or muscle group to search for"),
      },
    },
    async ({ query }) => {
      try {
        const allTemplates = [];
        let page = 1;
        const queryLower = query.toLowerCase();

        // Search through pages until we have enough or run out
        while (page <= 5) {
          const result = await client.getExerciseTemplates(page, 100);
          if (!result.exercise_templates.length) break;

          const matches = result.exercise_templates.filter(
            (t) =>
              t.title.toLowerCase().includes(queryLower) ||
              t.primary_muscle_group.toLowerCase().includes(queryLower) ||
              t.secondary_muscle_groups?.some((m) => m.toLowerCase().includes(queryLower))
          );
          allTemplates.push(...matches);

          if (result.exercise_templates.length < 100) break;
          page++;
        }

        if (!allTemplates.length) {
          return textResponse(`No exercises found matching "${query}".`);
        }

        return jsonResponse({
          query,
          matches: allTemplates.length,
          exercises: allTemplates.map((t) => ({
            id: t.id,
            title: t.title,
            primaryMuscle: t.primary_muscle_group,
            secondaryMuscles: t.secondary_muscle_groups,
            equipment: t.equipment,
            isCustom: t.is_custom,
          })),
        });
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}

// ─── ANALYSIS HELPERS ─────────────────────────────────────────────────

interface PlannedExercise {
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  targetRpe: number | null;
}

function analyzeWorkoutPerformance(workout: HevyWorkout, planned: PlannedExercise[]) {
  const duration = workout.start_time && workout.end_time
    ? Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000)
    : null;

  const exerciseResults = workout.exercises.map((actual) => {
    const plan = planned.find(
      (p) => p.name.toLowerCase() === actual.title.toLowerCase()
    );

    const workingSets = actual.sets.filter((s) => s.type === "normal" || s.type === "failure" || s.type === "dropset");
    const totalReps = workingSets.reduce((sum, s) => sum + (s.reps || 0), 0);
    const maxWeight = Math.max(...workingSets.map((s) => s.weight_kg || 0));
    const avgRpe = workingSets.filter((s) => s.rpe).length > 0
      ? workingSets.reduce((sum, s) => sum + (s.rpe || 0), 0) / workingSets.filter((s) => s.rpe).length
      : null;

    const setsCompleted = workingSets.length;
    const repsPerSet = setsCompleted > 0 ? totalReps / setsCompleted : 0;

    let recommendation = "maintain";
    if (plan) {
      const hitsReps = repsPerSet >= plan.targetReps;
      const hitsTarget = setsCompleted >= plan.targetSets;

      if (hitsReps && hitsTarget && avgRpe !== null && avgRpe <= 7) {
        recommendation = "increase_weight";
      } else if (hitsReps && hitsTarget && avgRpe !== null && avgRpe <= 8) {
        recommendation = "maintain_then_increase";
      } else if (!hitsReps && avgRpe !== null && avgRpe >= 9.5) {
        recommendation = "decrease_weight";
      } else if (!hitsReps) {
        recommendation = "hold_weight";
      }
    }

    return {
      exercise: actual.title,
      planned: plan
        ? { sets: plan.targetSets, reps: plan.targetReps, weightKg: plan.targetWeightKg, rpe: plan.targetRpe }
        : null,
      actual: {
        setsCompleted,
        avgRepsPerSet: Math.round(repsPerSet * 10) / 10,
        totalReps,
        maxWeightKg: maxWeight,
        avgRpe: avgRpe ? Math.round(avgRpe * 10) / 10 : null,
      },
      recommendation,
      notes: actual.notes,
    };
  });

  // Check for planned exercises that weren't done
  const skippedExercises = planned.filter(
    (p) => !workout.exercises.some(
      (a) => a.title.toLowerCase() === p.name.toLowerCase()
    )
  );

  const totalSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.type !== "warmup").length,
    0
  );

  return {
    workoutId: workout.id,
    title: workout.title,
    date: workout.start_time,
    durationMinutes: duration,
    totalWorkingSets: totalSets,
    exerciseResults,
    skippedExercises: skippedExercises.map((e) => e.name),
    overallAdherence: planned.length > 0
      ? Math.round(((planned.length - skippedExercises.length) / planned.length) * 100)
      : 100,
  };
}

function generateTrainingSummary(workouts: HevyWorkout[]) {
  const totalSessions = workouts.length;

  // Date range
  const dates = workouts.map((w) => new Date(w.start_time)).sort((a, b) => a.getTime() - b.getTime());
  const dateRange = {
    from: dates[0]?.toISOString().split("T")[0],
    to: dates[dates.length - 1]?.toISOString().split("T")[0],
  };

  // Training frequency
  const daysBetween: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    daysBetween.push(Math.round((dates[i].getTime() - dates[i - 1].getTime()) / 86400000));
  }
  const avgDaysBetween = daysBetween.length
    ? Math.round((daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length) * 10) / 10
    : 0;

  // Duration
  const durations = workouts
    .filter((w) => w.start_time && w.end_time)
    .map((w) => (new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  // Exercise frequency
  const exerciseCounts: Record<string, number> = {};
  const muscleGroupSets: Record<string, number> = {};

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      exerciseCounts[exercise.title] = (exerciseCounts[exercise.title] || 0) + 1;
      const workingSets = exercise.sets.filter((s) => s.type !== "warmup").length;
      muscleGroupSets[exercise.title] = (muscleGroupSets[exercise.title] || 0) + workingSets;
    }
  }

  // Sort by frequency
  const topExercises = Object.entries(exerciseCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([name, count]) => ({
      name,
      sessions: count,
      totalSets: muscleGroupSets[name] || 0,
    }));

  // Total volume
  const totalSets = workouts.reduce(
    (sum, w) => sum + w.exercises.reduce(
      (s, e) => s + e.sets.filter((set) => set.type !== "warmup").length,
      0
    ),
    0
  );

  return {
    period: dateRange,
    totalSessions,
    totalWorkingSets: totalSets,
    avgSessionDurationMinutes: avgDuration,
    avgDaysBetweenSessions: avgDaysBetween,
    sessionsPerWeek: avgDaysBetween > 0 ? Math.round((7 / avgDaysBetween) * 10) / 10 : 0,
    topExercises,
  };
}

function analyzeExerciseProgression(history: HevyExerciseHistoryEntry[]) {
  const sessions = history
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .map((entry) => {
      const workingSets = entry.sets.filter((s) => s.type !== "warmup");
      const maxWeight = Math.max(...workingSets.map((s) => s.weight_kg || 0));
      const maxReps = Math.max(...workingSets.map((s) => s.reps || 0));
      const totalVolume = workingSets.reduce(
        (sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0),
        0
      );

      // Epley formula: 1RM = weight × (1 + reps/30)
      const bestSet = workingSets.reduce(
        (best, s) => {
          const e1rm = (s.weight_kg || 0) * (1 + (s.reps || 0) / 30);
          return e1rm > best.e1rm ? { weight: s.weight_kg || 0, reps: s.reps || 0, e1rm } : best;
        },
        { weight: 0, reps: 0, e1rm: 0 }
      );

      return {
        date: entry.start_time.split("T")[0],
        workingSets: workingSets.length,
        maxWeightKg: maxWeight,
        maxReps,
        totalVolume: Math.round(totalVolume),
        estimated1RM: Math.round(bestSet.e1rm * 10) / 10,
        bestSet: { weightKg: bestSet.weight, reps: bestSet.reps },
      };
    });

  const allTime1RM = Math.max(...sessions.map((s) => s.estimated1RM));
  const latest1RM = sessions[sessions.length - 1]?.estimated1RM || 0;
  const earliest1RM = sessions[0]?.estimated1RM || 0;

  return {
    sessionCount: sessions.length,
    sessions,
    allTimeBestE1RM: allTime1RM,
    progressionKg: Math.round((latest1RM - earliest1RM) * 10) / 10,
    trend: latest1RM > earliest1RM ? "improving" : latest1RM === earliest1RM ? "plateau" : "declining",
  };
}
