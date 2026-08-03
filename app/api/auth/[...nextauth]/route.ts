import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/server/auth/config";
import { recordAuthSecurityEvent } from "@/lib/server/repositories/auth-repository";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
  const response = await handler.POST(request);
  const path = new URL(request.url).pathname;
  const sensitiveFailure =
    !response.ok &&
    [
      "/sign-in/email",
      "/sign-up/email",
      "/request-password-reset",
      "/reset-password",
    ].some((suffix) => path.endsWith(suffix));
  if (sensitiveFailure) {
    try {
      await recordAuthSecurityEvent({
        eventType: "AUTHENTICATION_REQUEST_REJECTED",
        success: false,
      });
    } catch {
      console.error("Authentication security event could not be recorded.");
    }
  }
  return response;
}
