import type { HevyClient } from "@furkantanyol/hevy-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonResponse, safe, textResponse } from "../utils/response.js";
import { pageSchema, routineExerciseSchema } from "./schemas.js";

const folderId = z.coerce
  .number()
  .int()
  .nullable()
  .optional()
  .describe(
    "Routine folder id from get-routine-folders; null or omitted for the default 'My Routines'",
  );

export function registerRoutineTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-routines",
    {
      description: "List saved routines (workout templates) with their exercises and target sets.",
      inputSchema: pageSchema,
    },
    safe(async ({ page, pageSize }) => {
      const result = await client.routines.list({ page, pageSize });
      return result.routines.length ? jsonResponse(result) : textResponse("No routines found.");
    }),
  );

  server.registerTool(
    "get-routine",
    {
      description: "Get one routine by id with every exercise and set.",
      inputSchema: { routineId: z.string().min(1) },
    },
    safe(async ({ routineId }) => jsonResponse(await client.routines.get(routineId))),
  );

  server.registerTool(
    "create-routine",
    {
      description:
        "Create a routine in the user's Hevy app. WORKFLOW: call batch-find-exercises with all exercise names first, then pass the returned ids here. Free Hevy accounts are limited to 4 routines (409 routine-limit-exceeded).",
      inputSchema: {
        title: z.string().min(1),
        folder_id: folderId,
        notes: z.string().optional().describe("Routine-level notes shown in the app"),
        exercises: z.array(routineExerciseSchema).min(1),
      },
    },
    safe(async ({ folder_id, ...routine }) =>
      jsonResponse(await client.routines.create({ ...routine, folder_id: folder_id ?? null })),
    ),
  );

  server.registerTool(
    "update-routine",
    {
      description:
        "Replace a routine by id: title, notes and every exercise and set are overwritten. Omit folder_id to keep the current folder, pass null to move it to 'My Routines'. Fetch it with get-routine first if you only want to change part of it.",
      inputSchema: {
        routineId: z.string().min(1),
        title: z.string().min(1),
        folder_id: folderId,
        notes: z.string().optional(),
        exercises: z.array(routineExerciseSchema).min(1),
      },
    },
    // Omitting folder_id keeps the current folder; null moves to "My Routines" (probes §9).
    safe(async ({ routineId, folder_id, ...routine }) =>
      jsonResponse(
        await client.routines.update(routineId, {
          ...routine,
          ...(folder_id === undefined ? {} : { folder_id }),
        }),
      ),
    ),
  );

  server.registerTool(
    "get-routine-folders",
    { description: "List routine folders (e.g. one per training block).", inputSchema: pageSchema },
    safe(async ({ page, pageSize }) =>
      jsonResponse(await client.routineFolders.list({ page, pageSize })),
    ),
  );

  server.registerTool(
    "get-routine-folder",
    {
      description: "Get one routine folder by id.",
      inputSchema: { folderId: z.coerce.number().int().gte(1) },
    },
    safe(async ({ folderId }) => jsonResponse(await client.routineFolders.get(folderId))),
  );

  server.registerTool(
    "create-routine-folder",
    {
      description:
        "Create a routine folder, e.g. 'Block 2 - Hypertrophy'. New folders appear at the top of the list.",
      inputSchema: { title: z.string().min(1) },
    },
    safe(async ({ title }) => jsonResponse(await client.routineFolders.create(title))),
  );
}
