import { createHevyClient, type HevyClientOptions } from "@furkantanyol/hevy-client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBodyMeasurementTools } from "./tools/body-measurements.js";
import { registerCoachingTools } from "./tools/coaching.js";
import { registerExerciseTools } from "./tools/exercises.js";
import { registerRoutineTools } from "./tools/routines.js";
import { registerUserTools } from "./tools/users.js";
import { registerWorkoutTools } from "./tools/workouts.js";

export const SERVER_VERSION = "1.0.0";

export function createServer(options: HevyClientOptions): McpServer {
  const server = new McpServer({ name: "hevy-coach", version: SERVER_VERSION });
  const client = createHevyClient(options);

  registerUserTools(server, client);
  registerWorkoutTools(server, client);
  registerRoutineTools(server, client);
  registerExerciseTools(server, client);
  registerBodyMeasurementTools(server, client);
  registerCoachingTools(server, client);

  return server;
}
