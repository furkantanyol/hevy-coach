import { describe, expect, it } from "vitest";
import { createHevyClient } from "./client.js";
import { mergeEvents } from "./sync.js";
import { calls, mockFetch } from "./test-utils.js";
import type { Workout, WorkoutEvent } from "./types.js";

const workout = (id: string, updated_at: string): Workout => ({
  id,
  updated_at,
  title: "t",
  routine_id: null,
  description: "",
  start_time: updated_at,
  end_time: updated_at,
  created_at: updated_at,
  exercises: [],
});
const updated = (id: string, at: string): WorkoutEvent => ({
  type: "updated",
  workout: workout(id, at),
});
const deleted = (id: string, at: string): WorkoutEvent => ({ type: "deleted", id, deleted_at: at });

describe("mergeEvents", () => {
  it("should split events into upserts and deletes", () => {
    const changes = mergeEvents([
      updated("a", "2026-09-08T10:00:00Z"),
      deleted("b", "2026-09-07T10:00:00Z"),
    ]);
    expect([changes.upserts.map((w) => w.id), changes.deletes.map((d) => d.id)]).toEqual([
      ["a"],
      ["b"],
    ]);
  });

  it("should keep only the newest event per workout when newest comes first", () => {
    const changes = mergeEvents([
      deleted("a", "2026-09-08T10:00:00Z"),
      updated("a", "2026-09-07T10:00:00Z"),
      updated("c", "2026-09-06T10:00:00Z"),
      updated("c", "2026-09-05T10:00:00Z"),
    ]);
    expect([changes.upserts.map((w) => w.id), changes.deletes.map((d) => d.id)]).toEqual([
      ["c"],
      ["a"],
    ]);
  });

  it("should return the newest timestamp as cursor regardless of event type", () => {
    const changes = mergeEvents([
      updated("a", "2026-09-07T10:00:00Z"),
      deleted("b", "2026-09-08T10:00:00Z"),
    ]);
    expect(changes.cursor).toBe("2026-09-08T10:00:00Z");
  });

  it("should return an undefined cursor for no events", () => {
    expect(mergeEvents([]).cursor).toBeUndefined();
  });
});

describe("workouts.changes", () => {
  it("should default since to the epoch for a full sync", async () => {
    const fetchFn = mockFetch({ body: { page: 1, page_count: 1, events: [] } });
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    const changes = await client.workouts.changes();
    expect(calls(fetchFn)[0]).toContain("since=1970-01-01T00%3A00%3A00Z");
    expect(changes).toEqual({ upserts: [], deletes: [], cursor: undefined });
  });

  it("should page through events with since and merge across pages", async () => {
    const fetchFn = mockFetch(
      { body: { page: 1, page_count: 2, events: [updated("a", "2026-09-08T10:00:00Z")] } },
      {
        body: {
          page: 2,
          page_count: 2,
          events: [deleted("a", "2026-09-01T10:00:00Z"), deleted("z", "2026-08-30T10:00:00Z")],
        },
      },
    );
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    const changes = await client.workouts.changes("2026-08-01T00:00:00Z");
    expect(calls(fetchFn)).toEqual([
      "GET https://api.hevyapp.com/v1/workouts/events?since=2026-08-01T00%3A00%3A00Z&page=1&pageSize=10",
      "GET https://api.hevyapp.com/v1/workouts/events?since=2026-08-01T00%3A00%3A00Z&page=2&pageSize=10",
    ]);
    expect({
      up: changes.upserts.map((w) => w.id),
      del: changes.deletes.map((d) => d.id),
      cursor: changes.cursor,
    }).toEqual({
      up: ["a"],
      del: ["z"],
      cursor: "2026-09-08T10:00:00Z",
    });
  });
});
