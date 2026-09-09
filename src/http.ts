#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response, NextFunction } from "express";
import { createServer } from "./index.js";

// --- Environment -----------------------------------------------------------

const apiKey = process.env.HEVY_API_KEY;
if (!apiKey) {
  console.error("HEVY_API_KEY environment variable is required.");
  console.error(
    "Get your API key from Hevy Settings → API (requires Pro subscription).",
  );
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);
const authToken = process.env.MCP_AUTH_TOKEN;

// --- Express app -----------------------------------------------------------

const app = createMcpExpressApp({ host: "0.0.0.0" });

// CORS — allow any origin so ChatGPT / Gemini can reach us
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, mcp-session-id",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS",
  );
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Bearer auth middleware — only applied when MCP_AUTH_TOKEN is set
function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  if (!authToken) {
    next();
    return;
  }
  const header = req.headers.authorization ?? "";
  if (header === `Bearer ${authToken}`) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

// --- Session store ---------------------------------------------------------

const transports = new Map<string, StreamableHTTPServerTransport>();

// --- Health check ----------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "hevy-coach" });
});

// --- MCP POST --------------------------------------------------------------

app.post("/mcp", bearerAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (sessionId) {
      const transport = transports.get(sessionId);
      if (!transport) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Unknown session ID" },
          id: null,
        });
        return;
      }
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: missing session ID or not an initialize request",
        },
        id: null,
      });
      return;
    }

    // New session — create transport, connect server, then handle request.
    // We use onsessioninitialized to store the transport in the map as soon
    // as the session ID is assigned, before any concurrent requests arrive.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
        console.log(`[hevy-coach] Session initialized: ${sid}`);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        transports.delete(sid);
        console.log(`[hevy-coach] Session closed: ${sid}`);
      }
    };

    const server = createServer(apiKey);
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[hevy-coach] Error handling POST /mcp:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// --- MCP GET (SSE stream) --------------------------------------------------

app.get("/mcp", bearerAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId) {
    res.status(400).send("Missing mcp-session-id header");
    return;
  }
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(400).send("Unknown session ID");
    return;
  }
  try {
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("[hevy-coach] Error handling GET /mcp:", err);
    if (!res.headersSent) res.status(500).send("Internal server error");
  }
});

// --- MCP DELETE (session termination) -------------------------------------

app.delete("/mcp", bearerAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId) {
    res.status(400).send("Missing mcp-session-id header");
    return;
  }
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(400).send("Unknown session ID");
    return;
  }
  try {
    await transport.handleRequest(req, res);
    transports.delete(sessionId);
  } catch (err) {
    console.error("[hevy-coach] Error handling DELETE /mcp:", err);
    if (!res.headersSent) res.status(500).send("Internal server error");
  }
});

// --- Start -----------------------------------------------------------------

app.listen(port, "0.0.0.0", () => {
  const authNote = authToken ? " (Bearer auth enabled)" : " (no auth)";
  console.log(
    `[hevy-coach] HTTP MCP server listening on http://0.0.0.0:${port}${authNote}`,
  );
  console.log(`[hevy-coach] Health: http://0.0.0.0:${port}/health`);
  console.log(`[hevy-coach] MCP endpoint: http://0.0.0.0:${port}/mcp`);
});

// --- Graceful shutdown -----------------------------------------------------

process.on("SIGINT", async () => {
  console.log("\n[hevy-coach] Shutting down...");
  const closeAll = [...transports.entries()].map(async ([sid, transport]) => {
    try {
      await transport.close();
      console.log(`[hevy-coach] Closed session ${sid}`);
    } catch (err) {
      console.error(`[hevy-coach] Error closing session ${sid}:`, err);
    }
  });
  await Promise.all(closeAll);
  console.log("[hevy-coach] Shutdown complete.");
  process.exit(0);
});
