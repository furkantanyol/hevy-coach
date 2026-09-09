import { HevyApiError, HevyNetworkError } from "./errors.js";

export const DEFAULT_BASE_URL = "https://api.hevyapp.com/v1";
const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 5_000;
const MS_PER_SECOND = 1_000;

export interface HevyClientOptions {
  apiKey: string;
  /** Defaults to the public API. Override for proxies or tests. */
  baseUrl?: string;
  /** Defaults to global fetch. Inject for tests or React Native polyfills. */
  fetch?: typeof fetch;
  /** Retries on 429, 5xx and network errors. Default 3. POST retries only on 429. */
  retries?: number;
  /** Cache GET responses in memory for this long. Off when omitted. Any write clears it. */
  cacheTtlMs?: number;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";
type Query = Record<string, string | number | undefined>;

export interface RequestOptions {
  method: Method;
  path: string;
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

interface CacheEntry {
  expires: number;
  value: unknown;
}

export class Http {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;
  private readonly retries: number;
  private readonly cacheTtlMs: number;
  // ponytail: unbounded Map keyed by URL; add LRU if an app keeps a client alive for days.
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly options: HevyClientOptions) {
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.retries = options.retries ?? DEFAULT_RETRIES;
    this.cacheTtlMs = options.cacheTtlMs ?? 0;
  }

  async request<T>(opts: RequestOptions): Promise<T> {
    const url = this.baseUrl + opts.path + toQueryString(opts.query);
    if (opts.method !== "GET") this.cache.clear();

    const cached = this.cacheTtlMs > 0 && opts.method === "GET" ? this.cache.get(url) : undefined;
    if (cached && cached.expires > Date.now()) return cached.value as T;

    const value = await this.send<T>(opts.method, url, opts.body, opts.signal);
    if (this.cacheTtlMs > 0 && opts.method === "GET") {
      this.cache.set(url, { expires: Date.now() + this.cacheTtlMs, value });
    }
    return value;
  }

  private async send<T>(
    method: Method,
    url: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.fetchFn(url, {
          method,
          headers: {
            "api-key": this.options.apiKey,
            accept: "application/json",
            ...(body !== undefined ? { "content-type": "application/json" } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal,
        });
      } catch (error) {
        if (signal?.aborted || attempt >= this.retries) throw new HevyNetworkError(error);
        await sleep(backoff(attempt));
        continue;
      }

      const parsed = await parseBody(response);
      if (response.ok) return parsed as T;

      if (attempt < this.retries && shouldRetry(method, response.status)) {
        await sleep(retryAfterMs(response) ?? backoff(attempt));
        continue;
      }
      throw new HevyApiError(response.status, parsed);
    }
  }
}

// POST is not idempotent: a 5xx may have created the resource, so only retry when
// the server explicitly rejected the request (429).
function shouldRetry(method: Method, status: number): boolean {
  if (status === 429) return true;
  return status >= 500 && method !== "POST";
}

function backoff(attempt: number): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  return exponential + Math.random() * exponential;
}

function retryAfterMs(response: Response): number | undefined {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * MS_PER_SECOND : undefined;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Built by hand: React Native's URLSearchParams is incomplete.
function toQueryString(query: Query | undefined): string {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
