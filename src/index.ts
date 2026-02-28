import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HevyClient } from "./utils/hevy-client.js";
import { registerWorkoutTools } from "./tools/workouts.js";
import { registerRoutineTools } from "./tools/routines.js";
import { registerExerciseTools } from "./tools/exercises.js";
import { registerCoachingTools } from "./tools/coaching.js";

export function createServer(apiKey: string): McpServer {
  const server = new McpServer({
    name: "hevy-coach",
    version: "0.1.0",
  });

  const client = new HevyClient(apiKey);

  registerWorkoutTools(server, client);
  registerRoutineTools(server, client);
  registerExerciseTools(server, client);
  registerCoachingTools(server, client);

  return server;
}
