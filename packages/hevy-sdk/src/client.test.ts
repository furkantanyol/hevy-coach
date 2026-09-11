import { describe, expect, it } from "vitest";
import { createHevyClient } from "./client.js";
import { calls, mockFetch } from "./test-utils.js";

describe("bodyMeasurements.upsert", () => {
  it("should create when no measurement exists for the date", async () => {
    const fetchFn = mockFetch({ status: 200 });
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    await client.bodyMeasurements.upsert({ date: "2026-09-09", weight_kg: 80 });
    expect(calls(fetchFn)).toEqual(["POST https://api.hevyapp.com/v1/body_measurements"]);
  });

  it("should fall back to PUT on 409 so repeated calls are idempotent", async () => {
    const fetchFn = mockFetch({ status: 409, body: { error: "already exists" } }, { status: 200 });
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    await client.bodyMeasurements.upsert({ date: "2026-09-09", weight_kg: 80 });
    expect(calls(fetchFn)).toEqual([
      "POST https://api.hevyapp.com/v1/body_measurements",
      "PUT https://api.hevyapp.com/v1/body_measurements/2026-09-09",
    ]);
    const [, putInit] = fetchFn.mock.calls[1] as [string, RequestInit];
    expect(putInit.body).toBe(JSON.stringify({ weight_kg: 80 }));
  });

  it("should rethrow non-409 errors", async () => {
    const fetchFn = mockFetch({ status: 400, body: { error: "Invalid request body" } });
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    await expect(client.bodyMeasurements.upsert({ date: "bad" })).rejects.toThrow(
      "Invalid request body",
    );
  });
});

describe("response envelopes", () => {
  it("should unwrap GET /routines/{id} and accept bare or wrapped PUT responses", async () => {
    const fetchFn = mockFetch(
      { body: { routine: { id: "r1" } } },
      { body: { routine: { id: "r1" } } },
      { body: { id: "r1" } },
    );
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    const input = { title: "t", exercises: [] };
    const ids = [
      (await client.routines.get("r1")).id,
      (await client.routines.update("r1", input)).id,
      (await client.routines.update("r1", input)).id,
    ];
    expect(ids).toEqual(["r1", "r1", "r1"]);
  });

  it("should unwrap user info and omit undefined query params", async () => {
    const fetchFn = mockFetch(
      { body: { data: { id: "u", name: "f", url: "x" } } },
      { body: { exercise_history: [] } },
    );
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    const user = await client.user.info();
    await client.exerciseHistory.get("D04AC939", { startDate: "2026-01-01" });
    expect(user.name).toBe("f");
    expect(calls(fetchFn)[1]).toBe(
      "GET https://api.hevyapp.com/v1/exercise_history/D04AC939?start_date=2026-01-01",
    );
  });
});
