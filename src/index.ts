import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HevyClient } from "./utils/hevy-client.js";
import { registerWorkoutTools } from "./tools/workouts.js";
import { registerRoutineTools } from "./tools/routines.js";
import { registerExerciseTools } from "./tools/exercises.js";
import { registerCoachingTools } from "./tools/coaching.js";
import { registerUserTools } from "./tools/users.js";
import { registerBodyMeasurementTools } from "./tools/body-measurements.js";

export function createServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "hevy-coach",
    version: "0.2.0",
  });

  const client = new HevyClient(apiKey);

  registerUserTools(server, client);
  registerWorkoutTools(server, client);
  registerRoutineTools(server, client);
  registerExerciseTools(server, client);
  registerBodyMeasurementTools(server, client);
  registerCoachingTools(server, client);

  return server;
}
