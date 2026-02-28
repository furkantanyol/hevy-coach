import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HevyClient } from "../utils/hevy-client.js";
import { jsonResponse, textResponse, errorResponse, getErrorMessage } from "../utils/response.js";

const repRangeSchema = z.object({
  start: z.coerce.number().int(),
  end: z.coerce.number().int(),
}).nullable().optional();

const setSchema = z.object({
  type: z.enum(["warmup", "normal", "failure", "dropset"]).default("normal"),
  weight_kg: z.coerce.number().nullable().optional(),
  reps: z.coerce.number().int().nullable().optional(),
  distance_meters: z.coerce.number().int().nullable().optional(),
  duration_seconds: z.coerce.number().int().nullable().optional(),
  custom_metric: z.coerce.number().nullable().optional(),
  rpe: z.coerce.number().nullable().optional(),
  rep_range: repRangeSchema,
});

const exerciseSchema = z.object({
  exercise_template_id: z.string().min(1),
  superset_id: z.coerce.number().nullable().optional(),
  rest_seconds: z.coerce.number().int().nullable().optional(),
  notes: z.string().optional(),
  sets: z.array(setSchema),
});

export function registerRoutineTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-routines",
    {
      description: "Get a paginated list of saved workout routines.",
      inputSchema: {
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(10).default(5),
      },
    },
    async ({ page, pageSize }) => {
      try {
        const result = await client.getRoutines(page, pageSize);
        if (!result.routines.length) return textResponse("No routines found.");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-routine",
    {
      description: "Get a specific routine by ID with all exercises and sets.",
      inputSchema: {
        routineId: z.string().min(1),
      },
    },
    async ({ routineId }) => {
      try {
        const routine = await client.getRoutine(routineId);
        if (!routine) return textResponse("Routine not found.");
        return jsonResponse(routine);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "create-routine",
    {
      description: `Create a new workout routine in Hevy.
WORKFLOW: First call batch-find-exercises with all exercise names to get template IDs, then call this tool.
Each exercise needs: exercise_template_id (hex string like "D04AC939"), optional rest_seconds, optional notes.
Each set needs: type (warmup/normal/failure/dropset), weight_kg, reps. Optional: distance_meters, duration_seconds, custom_metric, rpe, rep_range ({start, end}).`,
      inputSchema: {
        title: z.string().min(1),
        folderId: z.coerce.number().optional(),
        notes: z.string().optional(),
        exercises: z.array(exerciseSchema),
      },
    },
    async ({ title, folderId, notes, exercises }) => {
      try {
        const routine = await client.createRoutine({
          title,
          folder_id: folderId,
          notes,
          exercises,
        });
        return jsonResponse(routine);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "update-routine",
    {
      description: "Update an existing routine by ID. Replaces all exercises and sets. Same schema as create-routine.",
      inputSchema: {
        routineId: z.string().min(1),
        title: z.string().min(1),
        folderId: z.coerce.number().optional(),
        notes: z.string().optional(),
        exercises: z.array(exerciseSchema),
      },
    },
    async ({ routineId, title, folderId, notes, exercises }) => {
      try {
        const routine = await client.updateRoutine(routineId, {
          title,
          folder_id: folderId,
          notes,
          exercises,
        });
        return jsonResponse(routine);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "create-routine-folder",
    {
      description: "Create a folder to organize routines (e.g., by mesocycle or training phase).",
      inputSchema: {
        title: z.string().min(1),
      },
    },
    async ({ title }) => {
      try {
        const folder = await client.createRoutineFolder(title);
        return jsonResponse(folder);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-routine-folder",
    {
      description: "Get a single routine folder by ID.",
      inputSchema: {
        folderId: z.coerce.number().int().gte(1),
      },
    },
    async ({ folderId }) => {
      try {
        const folder = await client.getRoutineFolder(folderId);
        if (!folder) return textResponse("Routine folder not found.");
        return jsonResponse(folder);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-routine-folders",
    {
      description: "List all routine folders.",
      inputSchema: {
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(10).default(5),
      },
    },
    async ({ page, pageSize }) => {
      try {
        const result = await client.getRoutineFolders(page, pageSize);
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}
