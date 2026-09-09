import type { ExerciseHistoryEntry } from "@furkantanyol/hevy-client";
import { describe, expect, it } from "vitest";
import { analyzeExerciseProgression, findBestMatch } from "./coaching.js";

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
    expect(result.trend).toBe("improving");
    expect(result.progressionKg).toBe(10);
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
