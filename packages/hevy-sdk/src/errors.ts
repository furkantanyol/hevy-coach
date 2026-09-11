/** Non-2xx response. `body` is the parsed JSON or raw text Hevy returned. */
export class HevyApiError extends Error {
  readonly name = "HevyApiError";
  /** Machine-readable code when Hevy sends one, e.g. "routine-limit-exceeded". */
  readonly code: string | undefined;

  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(describe(status, body));
    this.code =
      typeof body === "object" && body !== null && "error" in body ? String(body.error) : undefined;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
}

/** fetch itself failed (DNS, offline, aborted) after retries were exhausted. */
export class HevyNetworkError extends Error {
  readonly name = "HevyNetworkError";
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
  }
}

// Hevy mixes plain-text bodies ("Workout not found"), {error} and {error, message}.
function describe(status: number, body: unknown): string {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (typeof body === "object" && body !== null) {
    const { message, error } = body as { message?: unknown; error?: unknown };
    if (typeof message === "string") return message;
    if (typeof error === "string") return error;
  }
  return `Hevy API request failed with HTTP ${status}`;
}
