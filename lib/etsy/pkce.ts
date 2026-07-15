import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
export const createOAuthState = () => randomBytes(32).toString("base64url");
export const hashOAuthState = (state: string) => createHash("sha256").update(state).digest("hex");
export function safeStateEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
