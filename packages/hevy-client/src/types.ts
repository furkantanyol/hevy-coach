import type { components } from "./generated/schema.js";

type Schemas = components["schemas"];

// --- Responses ---

export type Workout = Schemas["Workout"];
export type WorkoutExercise = NonNullable<Workout["exercises"]>[number];
export type WorkoutSet = NonNullable<WorkoutExercise["sets"]>[number];
export type SetType = NonNullable<WorkoutSet["type"]>;

export type Routine = Schemas["Routine"];
export type RoutineExercise = NonNullable<Routine["exercises"]>[number];
export type RoutineSet = NonNullable<RoutineExercise["sets"]>[number];

export type RoutineFolder = Schemas["RoutineFolder"];
export type ExerciseTemplate = Schemas["ExerciseTemplate"];
export type ExerciseHistoryEntry = Schemas["ExerciseHistoryEntry"];
export type BodyMeasurement = Schemas["BodyMeasurement"];
export type UserInfo = Schemas["UserInfo"];

export type UpdatedWorkoutEvent = Schemas["UpdatedWorkout"];
export type DeletedWorkoutEvent = Schemas["DeletedWorkout"];
export type WorkoutEvent = UpdatedWorkoutEvent | DeletedWorkoutEvent;

export type CustomExerciseType = Schemas["CustomExerciseType"];
export type MuscleGroup = Schemas["MuscleGroup"];
export type EquipmentCategory = Schemas["EquipmentCategory"];

// --- Request bodies ---

export type WorkoutInput = NonNullable<Schemas["PostWorkoutsRequestBody"]["workout"]>;
export type CreateRoutineInput = NonNullable<Schemas["PostRoutinesRequestBody"]["routine"]>;
export type UpdateRoutineInput = NonNullable<Schemas["PutRoutinesRequestBody"]["routine"]>;
export type CreateExerciseTemplateInput = NonNullable<
  Schemas["CreateCustomExerciseRequestBody"]["exercise"]
>;
export type BodyMeasurementInput = Omit<BodyMeasurement, "id" | "created_at">;
export type UpdateBodyMeasurementInput = Schemas["PutBodyMeasurement"];

/** Undocumented endpoint, verified live 2026-09-09 (docs/api/probes-2026-09-09.md §8). */
export interface WebhookSubscription {
  url: string;
  auth_token: string;
}
export interface WebhookSubscriptionInput {
  url: string;
  authToken: string;
}

// --- Pagination ---

export type PageParams = { page?: number; pageSize?: number };
