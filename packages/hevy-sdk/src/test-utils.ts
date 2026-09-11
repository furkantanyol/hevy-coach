import { vi } from "vitest";

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> };

/** A fetch mock that replies in order. JSON bodies are serialised; string bodies sent as text. */
export function mockFetch(...replies: Reply[]) {
  const fetchFn = vi.fn(async () => {
    const reply = replies.shift();
    if (!reply) throw new Error("mockFetch: no reply queued");
    const isText = typeof reply.body === "string";
    return new Response(
      reply.body === undefined ? null : isText ? String(reply.body) : JSON.stringify(reply.body),
      {
        status: reply.status ?? 200,
        headers: { "content-type": isText ? "text/plain" : "application/json", ...reply.headers },
      },
    );
  });
  return fetchFn as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

export const calls = (fetchFn: ReturnType<typeof vi.fn>) =>
  fetchFn.mock.calls.map(([url, init]) => `${(init as RequestInit).method} ${url}`);
