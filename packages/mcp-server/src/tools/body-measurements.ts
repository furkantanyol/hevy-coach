import type { HevyClient } from "@furkantanyol/hevy-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { jsonResponse, safe, textResponse } from "../utils/response.js";
import { pageSchema, ymdDate } from "./schemas.js";

const metric = z.coerce.number().nullable().optional();

const measurementFields = {
  weight_kg: metric,
  lean_mass_kg: metric,
  fat_percent: metric,
  neck_cm: metric,
  shoulder_cm: metric,
  chest_cm: metric,
  left_bicep_cm: metric,
  right_bicep_cm: metric,
  left_forearm_cm: metric,
  right_forearm_cm: metric,
  abdomen: metric.describe("cm"),
  waist: metric.describe("cm"),
  hips: metric.describe("cm"),
  left_thigh: metric.describe("cm"),
  right_thigh: metric.describe("cm"),
  left_calf: metric.describe("cm"),
  right_calf: metric.describe("cm"),
};

export function registerBodyMeasurementTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-body-measurements",
    {
      description:
        "List body measurements (weight, body fat %, circumferences in cm), newest first.",
      inputSchema: pageSchema,
    },
    safe(async ({ page, pageSize }) => {
      const result = await client.bodyMeasurements.list({ page, pageSize });
      return result.body_measurements.length
        ? jsonResponse(result)
        : textResponse("No body measurements found.");
    }),
  );

  server.registerTool(
    "get-body-measurement",
    { description: "Get the body measurement logged on one date.", inputSchema: { date: ymdDate } },
    safe(async ({ date }) => jsonResponse(await client.bodyMeasurements.get(date))),
  );

  server.registerTool(
    "log-body-measurement",
    {
      description:
        "Log or overwrite the body measurement for a date. Provide any subset of fields; kg and cm only. Overwriting replaces every field for that date, so include all values you want kept.",
      inputSchema: { date: ymdDate, ...measurementFields },
    },
    safe(async (measurement) => {
      await client.bodyMeasurements.upsert(measurement);
      return textResponse(`Body measurement saved for ${measurement.date}.`);
    }),
  );
}
