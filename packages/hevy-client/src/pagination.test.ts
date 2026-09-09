import { describe, expect, it } from "vitest";
import { createHevyClient } from "./client.js";
import { fetchAll } from "./pagination.js";
import { calls, mockFetch } from "./test-utils.js";

describe("fetchAll", () => {
  it("should walk every page and concatenate items in order", async () => {
    const pages = [
      { page: 1, page_count: 3, items: ["a", "b"] },
      { page: 2, page_count: 3, items: ["c"] },
      { page: 3, page_count: 3, items: ["d"] },
    ];
    const result = await fetchAll(async (page) => pages[page - 1]!);
    expect(result).toEqual(["a", "b", "c", "d"]);
  });

  it("should stop after one request when page_count is 0", async () => {
    let requests = 0;
    const result = await fetchAll(async () => {
      requests++;
      return { page: 1, page_count: 0, items: [] };
    });
    expect([result, requests]).toEqual([[], 1]);
  });
});

describe("workouts.listAll", () => {
  it("should request pages of 10 until page_count is reached", async () => {
    const fetchFn = mockFetch(
      { body: { page: 1, page_count: 2, workouts: [{ id: "w1" }] } },
      { body: { page: 2, page_count: 2, workouts: [{ id: "w2" }] } },
    );
    const client = createHevyClient({ apiKey: "k", fetch: fetchFn });
    const all = await client.workouts.listAll();
    expect(all.map((w) => w.id)).toEqual(["w1", "w2"]);
    expect(calls(fetchFn)).toEqual([
      "GET https://api.hevyapp.com/v1/workouts?page=1&pageSize=10",
      "GET https://api.hevyapp.com/v1/workouts?page=2&pageSize=10",
    ]);
  });
});
