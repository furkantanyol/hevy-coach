import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HevyClient } from "hevy-sdk";
import { jsonResponse, safe } from "../utils/response.js";

export function registerUserTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-user-info",
    {
      description:
        "Get the authenticated Hevy user's profile: id, display name and public profile URL.",
      inputSchema: {},
    },
    safe(async () => jsonResponse(await client.user.info())),
  );
}
