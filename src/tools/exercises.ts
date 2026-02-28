import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "../utils/hevy-client.js";
import { jsonResponse, textResponse, errorResponse, getErrorMessage } from "../utils/response.js";

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
      description: "Get the user's performance history for a specific exercise. Shows past sets, weights, reps, and RPE over time. Filter by date range.",
      inputSchema: {
        exerciseTemplateId: z.string().min(1),
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(10).default(5),
      },
    },
    async ({ exerciseTemplateId, page, pageSize }) => {
      try {
        const history = await client.getExerciseHistory(exerciseTemplateId, page, pageSize);
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
        type: z.enum([
          "weight_reps",
          "reps_only",
          "duration",
          "weight_duration",
          "distance_duration",
          "weight_distance",
          "distance_reps",
          "weight_reps_duration",
        ]),
        primary_muscle_group: z.string().min(1),
        secondary_muscle_groups: z.array(z.string()).optional(),
        equipment: z.string().optional(),
      },
    },
    async ({ title, type, primary_muscle_group, secondary_muscle_groups, equipment }) => {
      try {
        const template = await client.createExerciseTemplate({
          title,
          type,
          primary_muscle_group,
          secondary_muscle_groups,
          equipment,
        });
        return jsonResponse(template);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}
