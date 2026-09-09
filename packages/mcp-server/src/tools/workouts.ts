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

  const workoutSetSchema = z.object({
    type: z.enum(["warmup", "normal", "failure", "dropset"]).default("normal"),
    weight_kg: z.coerce.number().nullable().optional(),
    reps: z.coerce.number().int().nullable().optional(),
    distance_meters: z.coerce.number().int().nullable().optional(),
    duration_seconds: z.coerce.number().int().nullable().optional(),
    custom_metric: z.coerce.number().nullable().optional(),
    rpe: z.coerce.number().nullable().optional(),
  });

  const workoutExerciseSchema = z.object({
    exercise_template_id: z.string().min(1),
    superset_id: z.coerce.number().nullable().optional(),
    notes: z.string().optional(),
    sets: z.array(workoutSetSchema),
  });

  server.registerTool(
    "create-workout",
    {
      description: "Create a new workout in Hevy. Provide title, start/end times, and exercises with sets.",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
        start_time: z.string().min(1).describe("ISO 8601 timestamp, e.g. 2024-08-14T12:00:00Z"),
        end_time: z.string().min(1).describe("ISO 8601 timestamp, e.g. 2024-08-14T12:30:00Z"),
        is_private: z.boolean().default(false),
        exercises: z.array(workoutExerciseSchema),
      },
    },
    async ({ title, description, start_time, end_time, is_private, exercises }) => {
      try {
        const workout = await client.createWorkout({
          title,
          description,
          start_time,
          end_time,
          is_private,
          exercises,
        });
        return jsonResponse(workout);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "update-workout",
    {
      description: "Update an existing workout by ID. Replaces all exercises and sets.",
      inputSchema: {
        workoutId: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        start_time: z.string().min(1),
        end_time: z.string().min(1),
        is_private: z.boolean().default(false),
        exercises: z.array(workoutExerciseSchema),
      },
    },
    async ({ workoutId, title, description, start_time, end_time, is_private, exercises }) => {
      try {
        const workout = await client.updateWorkout(workoutId, {
          title,
          description,
          start_time,
          end_time,
          is_private,
          exercises,
        });
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
