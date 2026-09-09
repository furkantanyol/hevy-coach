import { HevyApiError, HevyNetworkError } from "@furkantanyol/hevy-client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function jsonResponse(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function textResponse(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResponse(error: unknown): CallToolResult {
  return { content: [{ type: "text", text: `Error: ${describeError(error)}` }], isError: true };
}

/** Wraps a tool handler so any thrown error becomes an MCP error result the LLM can read. */
export function safe<Args>(
  handler: (args: Args) => Promise<CallToolResult>,
): (args: Args) => Promise<CallToolResult> {
  return async (args) => {
    try {
      return await handler(args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

function describeError(error: unknown): string {
  if (error instanceof HevyApiError) {
    const code = error.code ? ` (${error.code})` : "";
    return `Hevy API ${error.status}${code}: ${error.message}`;
  }
  if (error instanceof HevyNetworkError) return `Could not reach Hevy: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
