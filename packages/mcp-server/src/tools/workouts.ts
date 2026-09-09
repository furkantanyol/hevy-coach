import type { HevyClient } from "@furkantanyol/hevy-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonResponse, safe, textResponse } from "../utils/response.js";
import { isoDateTime, pageSchema, workoutExerciseSchema } from "./schemas.js";

const workoutFields = {
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: isoDateTime("Start time"),
  end_time: isoDateTime("End time"),
  is_private: z.boolean().default(false),
  exercises: z.array(workoutExerciseSchema).min(1),
};

export function registerWorkoutTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-workouts",
    {
      description:
        "List logged workouts, newest first, with exercises, sets, weights, reps and RPE. Paginated; use get-training-summary for aggregates over many workouts.",
      inputSchema: pageSchema,
    },
    safe(async ({ page, pageSize }) => {
      const result = await client.workouts.list({ page, pageSize });
      return result.workouts.length ? jsonResponse(result) : textResponse("No workouts found.");
    }),
  );

  server.registerTool(
    "get-workout",
    {
      description: "Get one logged workout by id with every exercise and set.",
      inputSchema: { workoutId: z.string().min(1) },
    },
    safe(async ({ workoutId }) => jsonResponse(await client.workouts.get(workoutId))),
  );

  server.registerTool(
    "get-workout-count",
    { description: "Total number of workouts the user has logged.", inputSchema: {} },
    safe(async () => jsonResponse({ workout_count: await client.workouts.count() })),
  );

  server.registerTool(
    "get-workout-events",
    {
      description:
        "Workouts changed since an ISO timestamp, newest first, as 'updated' (full workout) or 'deleted' (id only) events. Use for syncing; omit `since` for everything.",
      inputSchema: {
        ...pageSchema,
        since: z
          .string()
          .optional()
          .describe("ISO 8601 timestamp; defaults to the beginning of time"),
      },
    },
    safe(async ({ page, pageSize, since }) =>
      jsonResponse(await client.workouts.events({ page, pageSize, since })),
    ),
  );

  server.registerTool(
    "create-workout",
    {
      description:
        "Log a completed workout in Hevy. Needs title, ISO start/end times and exercises with sets. Resolve exercise names to ids with batch-find-exercises first.",
      inputSchema: workoutFields,
    },
    safe(async (workout) => jsonResponse(await client.workouts.create(workout))),
  );

  server.registerTool(
    "update-workout",
    {
      description:
        "Replace a logged workout by id. All fields are overwritten, including every exercise and set.",
      inputSchema: { workoutId: z.string().min(1), ...workoutFields },
    },
    safe(async ({ workoutId, ...workout }) =>
      jsonResponse(await client.workouts.update(workoutId, workout)),
    ),
  );
}
