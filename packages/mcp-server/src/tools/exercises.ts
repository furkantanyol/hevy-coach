import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "../utils/hevy-client.js";
import { jsonResponse, textResponse, errorResponse, getErrorMessage } from "../utils/response.js";

const exerciseTypeSchema = z.enum([
  "weight_reps",
  "reps_only",
  "bodyweight_reps",
  "bodyweight_assisted_reps",
  "duration",
  "weight_duration",
  "distance_duration",
  "short_distance_weight",
]);

const equipmentCategorySchema = z.enum([
  "none",
  "barbell",
  "dumbbell",
  "kettlebell",
  "machine",
  "plate",
  "resistance_band",
  "suspension",
  "other",
]);

const muscleGroupSchema = z.enum([
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
]);

export function registerExerciseTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-exercise-templates",
    {
      description: "Browse the exercise library. Returns exercise names, muscle groups, equipment, and IDs. Use pageSize up to 100 to search broadly.",
      inputSchema: {
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(100).default(100),
      },
    },
    async ({ page, pageSize }) => {
      try {
        const result = await client.getExerciseTemplates(page, pageSize);
        if (!result.exercise_templates.length) return textResponse("No exercise templates found.");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-exercise-template",
    {
      description: "Get details of a specific exercise by ID — name, muscle groups, equipment type.",
      inputSchema: {
        exerciseTemplateId: z.string().min(1),
      },
    },
    async ({ exerciseTemplateId }) => {
      try {
        const template = await client.getExerciseTemplate(exerciseTemplateId);
        if (!template) return textResponse("Exercise template not found.");
        return jsonResponse(template);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-exercise-history",
    {
      description: "Get the user's performance history for a specific exercise. Shows past sets, weights, reps, and RPE over time. Optionally filter by date range (YYYY-MM-DD).",
      inputSchema: {
        exerciseTemplateId: z.string().min(1),
        startDate: z.string().optional().describe("Start date filter, YYYY-MM-DD"),
        endDate: z.string().optional().describe("End date filter, YYYY-MM-DD"),
      },
    },
    async ({ exerciseTemplateId, startDate, endDate }) => {
      try {
        const history = await client.getExerciseHistory(exerciseTemplateId, startDate, endDate);
        return jsonResponse(history);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "create-exercise-template",
    {
      description: "Create a custom exercise in the user's Hevy library.",
      inputSchema: {
        title: z.string().min(1),
        exercise_type: exerciseTypeSchema.describe("How the exercise is measured"),
        muscle_group: muscleGroupSchema.describe("Primary muscle group"),
        other_muscles: z.array(muscleGroupSchema).optional().describe("Secondary muscle groups"),
        equipment_category: equipmentCategorySchema.describe("Equipment used"),
      },
    },
    async ({ title, exercise_type, muscle_group, other_muscles, equipment_category }) => {
      try {
        const template = await client.createExerciseTemplate({
          title,
          exercise_type,
          muscle_group,
          other_muscles,
          equipment_category,
        });
        return jsonResponse(template);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}
