import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HevyClient } from "../utils/hevy-client.js";
import { jsonResponse, errorResponse, getErrorMessage } from "../utils/response.js";

export function registerUserTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-user-info",
    {
      description: "Get the authenticated user's profile info: ID, name, and Hevy profile URL.",
      inputSchema: {},
    },
    async () => {
      try {
        const user = await client.getUserInfo();
        return jsonResponse(user);
      } catch (error) {
        return errorResponse(getErrorMessage(error));
      }
    }
  );
}
