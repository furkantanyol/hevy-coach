import { describe, expect, it, vi } from "vitest";
import { createHevyClient } from "./client.js";
import { HevyApiError, HevyNetworkError } from "./errors.js";
import { calls, mockFetch } from "./test-utils.js";

const fast = { apiKey: "k", retries: 2 };
const noWait = () =>
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((fn: () => void) => {
    fn();
    return 0;
  }) as unknown as typeof setTimeout);

describe("request", () => {
  it("should send the api-key header and JSON body", async () => {
    const fetchFn = mockFetch({ status: 201, body: { id: "f1", title: "Block 2" } });
    const client = createHevyClient({ apiKey: "secret", fetch: fetchFn });
    await client.routineFolders.create("Block 2");
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect([init.method, (init.headers as Record<string, string>)["api-key"], init.body]).toEqual([
      "POST",
      "secret",
      JSON.stringify({ routine_folder: { title: "Block 2" } }),
    ]);
  });

  it("should throw HevyApiError with Hevy's code and message on 409", async () => {
    const fetchFn = mockFetch({
      status: 409,
      body: {
        error: "routine-limit-exceeded",
        message: "Free accounts are limited to 4 routines.",
      },
    });
    const client = createHevyClient({ ...fast, fetch: fetchFn });
    const error = await client.routines.create({ title: "x", exercises: [] }).catch((e) => e);
    expect(error).toBeInstanceOf(HevyApiError);
    expect([error.status, error.code, error.message]).toEqual([
      409,
      "routine-limit-exceeded",
      "Free accounts are limited to 4 routines.",
    ]);
  });

  it("should keep plain-text error bodies as the message", async () => {
    const fetchFn = mockFetch({ status: 404, body: "Workout not found" });
    const client = createHevyClient({ ...fast, fetch: fetchFn });
    const error = await client.workouts.get("nope").catch((e) => e);
    expect([error.isNotFound, error.message, error.body]).toEqual([
      true,
      "Workout not found",
      "Workout not found",
    ]);
  });

  it("should retry a GET on 503 and then succeed", async () => {
    noWait();
    const fetchFn = mockFetch({ status: 503, body: "" }, { body: { workout_count: 7 } });
    const client = createHevyClient({ ...fast, fetch: fetchFn });
    expect(await client.workouts.count()).toBe(7);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("should not retry a POST on 500", async () => {
    noWait();
    const fetchFn = mockFetch({ status: 500, body: "" });
    const client = createHevyClient({ ...fast, fetch: fetchFn });
    await expect(client.routineFolders.create("x")).rejects.toBeInstanceOf(HevyApiError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("should retry a POST on 429 honouring retry-after", async () => {
    const timer = noWait();
    const fetchFn = mockFetch(
      { status: 429, body: "", headers: { "retry-after": "2" } },
      { status: 201, body: { id: 1 } },
    );
    const client = createHevyClient({ ...fast, fetch: fetchFn });
    await client.routineFolders.create("x");
    expect(timer).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it("should wrap fetch failures as HevyNetworkError after retries", async () => {
    noWait();
    const fetchFn = vi.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    const client = createHevyClient({ ...fast, fetch: fetchFn });
    await expect(client.user.info()).rejects.toBeInstanceOf(HevyNetworkError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("should serve repeated GETs from cache and clear it on any write", async () => {
    const fetchFn = mockFetch(
      { body: { workout_count: 1 } },
      { status: 201, body: {} },
      { body: { workout_count: 2 } },
    );
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn, cacheTtlMs: 60_000 });
    const first = await client.workouts.count();
    const second = await client.workouts.count();
    await client.routineFolders.create("x");
    const third = await client.workouts.count();
    expect([first, second, third]).toEqual([1, 1, 2]);
    expect(calls(fetchFn)).toHaveLength(3);
  });
});
