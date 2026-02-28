#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index.js";

const apiKey = process.env.HEVY_API_KEY;

if (!apiKey) {
  console.error("HEVY_API_KEY environment variable is required.");
  console.error("Get your API key from Hevy Settings → API (requires Pro subscription).");
  process.exit(1);
}

const server = createServer(apiKey);
const transport = new StdioServerTransport();

server.connect(transport).catch((err) => {
  console.error("Failed to start hevy-coach:", err);
  process.exit(1);
});
