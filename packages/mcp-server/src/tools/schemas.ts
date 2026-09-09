import {
  MAX_PAGE_SIZE,
  MAX_TEMPLATE_PAGE_SIZE,
  type Rpe,
  type SetType,
} from "@furkantanyol/hevy-client";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = 5;

export const SET_TYPES = [
  "warmup",
  "normal",
  "failure",
  "dropset",
] as const satisfies readonly SetType[];
const RPE_VALUES = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const satisfies readonly Rpe[];

export const pageSchema = {
  page: z.coerce.number().int().gte(1).default(1).describe("1-based page number"),
  pageSize: z.coerce
    .number()
    .int()
    .gte(1)
    .lte(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .describe(`Items per page, max ${MAX_PAGE_SIZE} (Hevy limit)`),
};

export const templatePageSchema = {
  page: z.coerce.number().int().gte(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .gte(1)
    .lte(MAX_TEMPLATE_PAGE_SIZE)
    .default(MAX_TEMPLATE_PAGE_SIZE),
};

export const isoDateTime = (label: string) =>
  z.string().min(1).describe(`${label} as ISO 8601, e.g. 2026-09-09T18:30:00Z`);

export const ymdDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .describe("Calendar date, YYYY-MM-DD");

const nullableNumber = z.coerce.number().nullable().optional();
const nullableInt = z.coerce.number().int().nullable().optional();

export const setFields = {
  type: z.enum(SET_TYPES).default("normal"),
  weight_kg: nullableNumber.describe("Weight in kg (metric only)"),
  reps: nullableInt,
  distance_meters: nullableInt,
  duration_seconds: nullableInt,
  custom_metric: nullableNumber.describe("Floors or steps for stair machines"),
};

export const workoutSetSchema = z.object({
  ...setFields,
  rpe: z
    .literal(RPE_VALUES)
    .nullable()
    .optional()
    .describe("Rate of perceived exertion, 6 to 10 in half steps"),
});

export const routineSetSchema = z.object({
  ...setFields,
  rep_range: z
    .object({ start: z.coerce.number().int(), end: z.coerce.number().int() })
    .nullable()
    .optional()
    .describe("Target rep range, e.g. {start: 8, end: 12}"),
});

export const exerciseTemplateId = z
  .string()
  .min(1)
  .describe(
    'Hevy exercise template id, e.g. "D04AC939". Resolve names with batch-find-exercises first.',
  );

export const workoutExerciseSchema = z.object({
  exercise_template_id: exerciseTemplateId,
  superset_id: nullableInt.describe(
    "Same integer on every exercise in one superset; null otherwise",
  ),
  notes: z.string().optional(),
  sets: z.array(workoutSetSchema).min(1),
});

export const routineExerciseSchema = z.object({
  exercise_template_id: exerciseTemplateId,
  superset_id: nullableInt.describe(
    "Same integer on every exercise in one superset; null otherwise",
  ),
  rest_seconds: nullableInt.describe("Rest between sets in seconds"),
  notes: z.string().optional().describe("Coaching cue shown in the app"),
  sets: z.array(routineSetSchema).min(1),
});
