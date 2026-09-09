import { timingSafeEqual } from "node:crypto";

/** Bearer tokens shorter than this are refused at startup: this token guards a whole Hevy account. */
export const MIN_TOKEN_LENGTH = 32;

/** Constant-time bearer check. An empty or missing header never matches. */
export function isAuthorized(authorizationHeader: string | undefined, token: string): boolean {
  const presented = Buffer.from((authorizationHeader ?? "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(token);
  if (presented.length === 0 || presented.length !== expected.length) return false;
  return timingSafeEqual(presented, expected);
}
