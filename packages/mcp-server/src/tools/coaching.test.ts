import type { ExerciseHistoryEntry } from "@furkantanyol/hevy-client";
import { describe, expect, it } from "vitest";
import { analyzeExerciseProgression, findBestMatch, recommend } from "./coaching.js";

const row = (over: Partial<ExerciseHistoryEntry>): ExerciseHistoryEntry => ({
  workout_id: "w1",
  workout_title: "Lower",
  workout_start_time: "2026-09-01T10:00:00+00:00",
  workout_end_time: "2026-09-01T11:00:00+00:00",
  exercise_template_id: "D04AC939",
  weight_kg: 100,
  reps: 5,
  distance_meters: null,
  duration_seconds: null,
  rpe: null,
  custom_metric: null,
  set_type: "normal",
  ...over,
});

describe("analyzeExerciseProgression", () => {
  it("should group flat rows into one session per workout, oldest first", () => {
    const history = [
      row({ workout_id: "w2", workout_start_time: "2026-09-08T10:00:00+00:00", weight_kg: 105 }),
      row({ workout_id: "w2", workout_start_time: "2026-09-08T10:00:00+00:00", weight_kg: 105 }),
      row({ workout_id: "w1", set_type: "warmup", weight_kg: 60 }),
      row({ workout_id: "w1" }),
    ];
    const result = analyzeExerciseProgression(history);
    expect(result.sessions.map((s) => [s.date, s.workingSets, s.maxWeightKg])).toEqual([
      ["2026-09-01", 1, 100],
      ["2026-09-08", 2, 105],
    ]);
  });

  it("should report improving trend with Epley e1RM delta", () => {
    const history = [
      row({ workout_id: "w1", weight_kg: 100, reps: 5 }),
      row({
        workout_id: "w2",
        workout_start_time: "2026-09-08T10:00:00+00:00",
        weight_kg: 100,
        reps: 8,
      }),
    ];
    const result = analyzeExerciseProgression(history);
    expect([result.trendMetric, result.trend, result.progression]).toEqual([
      "estimated1RM",
      "improving",
      10,
    ]);
  });

  it("should trend bodyweight exercises on max reps", () => {
    const history = [
      row({ workout_id: "w1", weight_kg: null, reps: 5 }),
      row({
        workout_id: "w2",
        workout_start_time: "2026-09-08T10:00:00+00:00",
        weight_kg: null,
        reps: 8,
      }),
    ];
    const result = analyzeExerciseProgression(history);
    expect([
      result.trendMetric,
      result.trend,
      result.progression,
      result.sessions[0]?.bestSet,
    ]).toEqual(["maxReps", "improving", 3, { weightKg: 0, reps: 5 }]);
  });

  it("should compute the all-time best across sessions outside the window", () => {
    const history = [
      row({ workout_id: "w1", weight_kg: 120, reps: 5 }),
      row({
        workout_id: "w2",
        workout_start_time: "2026-09-08T10:00:00+00:00",
        weight_kg: 100,
        reps: 5,
      }),
      row({
        workout_id: "w3",
        workout_start_time: "2026-09-15T10:00:00+00:00",
        weight_kg: 100,
        reps: 5,
      }),
    ];
    const result = analyzeExerciseProgression(history, 2);
    expect([result.sessionCount, result.allTimeBestE1RM]).toEqual([2, 140]);
  });
});

describe("recommend", () => {
  const plan = { name: "Squat", targetSets: 3, targetReps: 8, targetWeightKg: 100, targetRpe: 8 };

  it.each([
    ["increase_weight when reps and sets hit at RPE 7", 8, 3, 7],
    ["maintain_then_increase when reps and sets hit at RPE 8", 8, 3, 8],
    ["maintain when reps and sets hit at RPE 9", 8, 3, 9],
    ["hold_weight when the weakest set misses reps", 6, 3, 8],
    ["decrease_weight when reps missed at RPE 9.5+", 6, 3, 9.5],
    ["maintain when reps hit but a set was skipped", 8, 2, 7],
  ] as const)("should return %s", (label, minReps, sets, rpe) => {
    expect(recommend(plan, minReps, sets, rpe)).toBe(label.split(" ")[0]);
  });

  it("should return maintain without a plan", () => {
    expect(recommend(undefined, 0, 0, null)).toBe("maintain");
  });
});

describe("findBestMatch", () => {
  const library = [
    { id: "A", title: "Squat (Bodyweight)" },
    { id: "B", title: "Squat (Barbell)" },
    { id: "C", title: "Front Squat" },
    { id: "D", title: "Bench Press (Barbell)" },
  ];

  it("should prefer an exact normalised title match", () => {
    expect(findBestMatch(library, "  squat (barbell) ")?.id).toBe("B");
  });

  it("should rank partial matches by shortest title", () => {
    expect(findBestMatch(library, "squat")?.id).toBe("C");
  });

  it("should return null when nothing matches", () => {
    expect(findBestMatch(library, "deadlift")).toBeNull();
  });
});
