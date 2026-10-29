import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HevyClient } from "hevy-sdk";
import { jsonResponse, safe } from "../utils/response.js";

export function registerUserTools(server: McpServer, client: HevyClient) {
  server.registerTool(
    "get-user-info",
    {
      description:
        "Get the authenticated Hevy user's profile: id, username, display name, public profile URL, whether they are on Hevy Pro, and their preferred weight (kg/lbs) and distance (kilometers/miles) units. Use the units when presenting numbers.",
      inputSchema: {},
    },
    safe(async () => jsonResponse(await client.user.info())),
  );
}
