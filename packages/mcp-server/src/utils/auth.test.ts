import { describe, expect, it } from "vitest";
import { isAuthorized } from "./auth.js";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("isAuthorized", () => {
  it("should accept the exact bearer token", () => {
    expect(isAuthorized(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it("should reject a missing header", () => {
    expect(isAuthorized(undefined, TOKEN)).toBe(false);
  });

  it("should reject an empty header even when the configured token is empty", () => {
    expect(isAuthorized("", "")).toBe(false);
  });

  it("should reject a token of the same length that differs", () => {
    expect(isAuthorized(`Bearer ${TOKEN.replace("a", "b")}`, TOKEN)).toBe(false);
  });

  it("should reject a prefix of the token", () => {
    expect(isAuthorized(`Bearer ${TOKEN.slice(0, 16)}`, TOKEN)).toBe(false);
  });
});
