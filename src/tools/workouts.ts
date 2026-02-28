import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "../utils/hevy-client.js";
import { jsonResponse, textResponse, errorResponse, getErrorMessage } from "../utils/response.js";

export function registerWorkoutTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-workouts",
    {
      description: "Get a paginated list of workouts, newest first. Includes exercises, sets, weights, reps, and RPE.",
      inputSchema: {
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(10).default(5),
      },
    },
    async ({ page, pageSize }) => {
      try {
        const result = await client.getWorkouts(page, pageSize);
        if (!result.workouts.length) return textResponse("No workouts found.");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-workout",
    {
      description: "Get complete details of a specific workout by ID.",
      inputSchema: {
        workoutId: z.string().min(1),
      },
    },
    async ({ workoutId }) => {
      try {
        const workout = await client.getWorkout(workoutId);
        if (!workout) return textResponse("Workout not found.");
        return jsonResponse(workout);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-workout-count",
    {
      description: "Get total number of logged workouts.",
      inputSchema: {},
    },
    async () => {
      try {
        const count = await client.getWorkoutCount();
        return jsonResponse({ workout_count: count });
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-workout-events",
    {
      description: "Get workout events (creates/updates/deletes) since a given date. For syncing and tracking changes.",
      inputSchema: {
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(10).default(5),
        since: z.string().default("1970-01-01T00:00:00Z"),
      },
    },
    async ({ page, pageSize, since }) => {
      try {
        const events = await client.getWorkoutEvents(page, pageSize, since);
        return jsonResponse(events);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}
