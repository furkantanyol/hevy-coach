#!/usr/bin/env node

import { randomUUID, timingSafeEqual } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { NextFunction, Request, Response } from "express";
import { createServer } from "./index.js";

// All logging goes to stderr so stdout stays free for tooling.
const log = (message: string) => console.error(`[hevy-coach] ${message}`);
const fail = (message: string): never => {
  log(message);
  process.exit(1);
};

// --- Environment -----------------------------------------------------------

const DEFAULT_PORT = 3000;
const LOCALHOST = "127.0.0.1";
const csv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const apiKey = process.env.HEVY_API_KEY ?? fail("HEVY_API_KEY environment variable is required.");
const authToken =
  process.env.MCP_AUTH_TOKEN ??
  fail(
    "MCP_AUTH_TOKEN is required: this server proxies your Hevy account. Generate a long random secret.",
  );
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const host = process.env.HOST ?? LOCALHOST;
const allowedHosts = csv(process.env.MCP_ALLOWED_HOSTS);
const allowedOrigins = csv(process.env.MCP_ALLOWED_ORIGINS);

if (host !== LOCALHOST && allowedHosts.length === 0) {
  fail(
    `HOST=${host} exposes the server beyond localhost; set MCP_ALLOWED_HOSTS to your public hostname(s).`,
  );
}

// --- Express app -----------------------------------------------------------

// DNS-rebinding protection: on localhost the SDK validates Host/Origin; elsewhere it uses allowedHosts.
const app = createMcpExpressApp(host === LOCALHOST ? { host } : { host, allowedHosts });

// CORS only for explicitly listed browser origins. Server-to-server MCP clients need none.
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const presented = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(authToken);
  if (presented.length === expected.length && timingSafeEqual(presented, expected)) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

// --- Sessions --------------------------------------------------------------

const transports = new Map<string, StreamableHTTPServerTransport>();

const jsonRpcError = (res: Response, status: number, message: string) =>
  res.status(status).json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });

function existingTransport(req: Request, res: Response): StreamableHTTPServerTransport | undefined {
  const sessionId = req.headers["mcp-session-id"];
  const transport = typeof sessionId === "string" ? transports.get(sessionId) : undefined;
  if (!transport) jsonRpcError(res, 400, "Missing or unknown mcp-session-id");
  return transport;
}

async function startSession(req: Request, res: Response): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => {
      transports.set(sid, transport);
      log(`session started ${sid}`);
    },
  });
  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
      log(`session closed ${transport.sessionId}`);
    }
  };
  await createServer({ apiKey }).connect(transport);
  await transport.handleRequest(req, res, req.body);
}

// --- Routes ----------------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "hevy-coach" });
});

app.post("/mcp", bearerAuth, async (req: Request, res: Response) => {
  try {
    if (req.headers["mcp-session-id"]) {
      await existingTransport(req, res)?.handleRequest(req, res, req.body);
    } else if (isInitializeRequest(req.body)) {
      await startSession(req, res);
    } else {
      jsonRpcError(res, 400, "Bad Request: missing session ID or not an initialize request");
    }
  } catch (error) {
    log(`POST /mcp failed: ${String(error)}`);
    if (!res.headersSent) jsonRpcError(res, 500, "Internal server error");
  }
});

for (const method of ["get", "delete"] as const) {
  app[method]("/mcp", bearerAuth, async (req: Request, res: Response) => {
    const transport = existingTransport(req, res);
    if (!transport) return;
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      log(`${method.toUpperCase()} /mcp failed: ${String(error)}`);
      if (!res.headersSent) res.status(500).send("Internal server error");
    }
  });
}

// --- Start / stop ----------------------------------------------------------

app.listen(port, host, () => {
  log(`listening on http://${host}:${port}/mcp (bearer auth on)`);
});

process.on("SIGINT", async () => {
  log("shutting down");
  await Promise.all([...transports.values()].map((t) => t.close().catch(() => undefined)));
  process.exit(0);
});
