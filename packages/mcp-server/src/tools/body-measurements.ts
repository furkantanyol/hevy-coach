import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BodyMeasurementUpdateInput, HevyClient } from "../utils/hevy-client.js";
import { jsonResponse, textResponse, errorResponse, getErrorMessage } from "../utils/response.js";

const measurementFields = {
  weight_kg: z.coerce.number().nullable().optional(),
  lean_mass_kg: z.coerce.number().nullable().optional(),
  fat_percent: z.coerce.number().nullable().optional(),
  neck_cm: z.coerce.number().nullable().optional(),
  shoulder_cm: z.coerce.number().nullable().optional(),
  chest_cm: z.coerce.number().nullable().optional(),
  left_bicep_cm: z.coerce.number().nullable().optional(),
  right_bicep_cm: z.coerce.number().nullable().optional(),
  left_forearm_cm: z.coerce.number().nullable().optional(),
  right_forearm_cm: z.coerce.number().nullable().optional(),
  abdomen: z.coerce.number().nullable().optional(),
  waist: z.coerce.number().nullable().optional(),
  hips: z.coerce.number().nullable().optional(),
  left_thigh: z.coerce.number().nullable().optional(),
  right_thigh: z.coerce.number().nullable().optional(),
  left_calf: z.coerce.number().nullable().optional(),
  right_calf: z.coerce.number().nullable().optional(),
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export function registerBodyMeasurementTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-body-measurements",
    {
      description: "Get a paginated list of body measurements (weight, body fat %, circumferences), newest first.",
      inputSchema: {
        page: z.coerce.number().int().gte(1).default(1),
        pageSize: z.coerce.number().int().gte(1).lte(10).default(5),
      },
    },
    async ({ page, pageSize }) => {
      try {
        const result = await client.getBodyMeasurements(page, pageSize);
        if (!result.body_measurements.length) return textResponse("No body measurements found.");
        return jsonResponse(result);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "get-body-measurement",
    {
      description: "Get the body measurement logged for a specific date (YYYY-MM-DD).",
      inputSchema: {
        date: dateSchema,
      },
    },
    async ({ date }) => {
      try {
        const measurement = await client.getBodyMeasurement(date);
        if (!measurement) return textResponse("No body measurement found for that date.");
        return jsonResponse(measurement);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "create-body-measurement",
    {
      description: "Log a new body measurement for a date. Fails if a measurement already exists for that date — use update-body-measurement instead. All metric fields are optional; provide what you have. Weight in kg, circumferences in cm.",
      inputSchema: {
        date: dateSchema,
        ...measurementFields,
      },
    },
    async ({ date, ...fields }) => {
      try {
        await client.createBodyMeasurement({ date, ...fields });
        return textResponse(`Body measurement logged for ${date}.`);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );

  server.registerTool(
    "update-body-measurement",
    {
      description: "Update the body measurement for an existing date (YYYY-MM-DD). Provide the fields to change. Weight in kg, circumferences in cm.",
      inputSchema: {
        date: dateSchema,
        ...measurementFields,
      },
    },
    async ({ date, ...fields }) => {
      try {
        await client.updateBodyMeasurement(date, fields as BodyMeasurementUpdateInput);
        return textResponse(`Body measurement updated for ${date}.`);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}
