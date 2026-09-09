import type {
  CustomExerciseType,
  EquipmentCategory,
  HevyClient,
  MuscleGroup,
} from "@furkantanyol/hevy-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonResponse, safe, textResponse } from "../utils/response.js";
import { invalidateLibrary } from "./coaching.js";
import { exerciseTemplateId, templatePageSchema } from "./schemas.js";

const EXERCISE_TYPES = [
  "weight_reps",
  "reps_only",
  "bodyweight_reps",
  "bodyweight_assisted_reps",
  "duration",
  "weight_duration",
  "distance_duration",
  "short_distance_weight",
] as const satisfies readonly CustomExerciseType[];

const EQUIPMENT = [
  "none",
  "barbell",
  "dumbbell",
  "kettlebell",
  "machine",
  "plate",
  "resistance_band",
  "suspension",
  "other",
] as const satisfies readonly EquipmentCategory[];

const MUSCLE_GROUPS = [
  "abdominals",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "calves",
  "glutes",
  "abductors",
  "adductors",
  "lats",
  "upper_back",
  "traps",
  "lower_back",
  "chest",
  "cardio",
  "neck",
  "full_body",
  "other",
] as const satisfies readonly MuscleGroup[];

export function registerExerciseTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-exercise-templates",
    {
      description:
        "Browse the exercise library page by page (up to 100 per page): id, title, type, muscle groups, equipment. Prefer batch-find-exercises when you know the names.",
      inputSchema: templatePageSchema,
    },
    safe(async ({ page, pageSize }) => {
      const result = await client.exerciseTemplates.list({ page, pageSize });
      return result.exercise_templates.length
        ? jsonResponse(result)
        : textResponse("No exercise templates found.");
    }),
  );

  server.registerTool(
    "get-exercise-template",
    {
      description:
        "Get one exercise template by id: title, measurement type, muscle groups, equipment.",
      inputSchema: { exerciseTemplateId },
    },
    safe(async ({ exerciseTemplateId }) =>
      jsonResponse(await client.exerciseTemplates.get(exerciseTemplateId)),
    ),
  );

  server.registerTool(
    "get-exercise-history",
    {
      description:
        "Every logged set for one exercise, newest workout first, flat (one row per set with workout id, date, weight, reps, RPE, set type). Use get-exercise-progression for trends.",
      inputSchema: {
        exerciseTemplateId,
        startDate: z.string().optional().describe("Inclusive start, YYYY-MM-DD or ISO 8601"),
        endDate: z.string().optional().describe("Inclusive end, YYYY-MM-DD or ISO 8601"),
      },
    },
    safe(async ({ exerciseTemplateId, startDate, endDate }) =>
      jsonResponse(await client.exerciseHistory.get(exerciseTemplateId, { startDate, endDate })),
    ),
  );

  server.registerTool(
    "create-exercise-template",
    {
      description:
        "Create a custom exercise in the user's library. Check batch-find-exercises first to avoid duplicating a built-in exercise. The response id is NOT an exercise_template_id: after creating, call batch-find-exercises with the title to get the id to use in routines and workouts.",
      inputSchema: {
        title: z.string().min(1),
        exercise_type: z.enum(EXERCISE_TYPES).describe("How the exercise is measured"),
        muscle_group: z.enum(MUSCLE_GROUPS).describe("Primary muscle group"),
        other_muscles: z
          .array(z.enum(MUSCLE_GROUPS))
          .optional()
          .describe("Secondary muscle groups"),
        equipment_category: z.enum(EQUIPMENT),
      },
    },
    safe(async (exercise) => {
      const created = await client.exerciseTemplates.create(exercise);
      invalidateLibrary();
      return jsonResponse(created);
    }),
  );
}
