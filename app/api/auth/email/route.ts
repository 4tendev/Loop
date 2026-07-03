import { NextRequest } from "next/server";
import {
  apiResponse,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getOrCreateUser } from "@/lib/auth/email";
import {
  getOrCreateEmailLoginCode,
  verifySavedEmailLoginCode,
} from "@/lib/auth/email/login-code";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type EmailLoginRequestBody = {
  email?: unknown;
  code?: unknown;
};

export async function POST(request: NextRequest) {
  let body: EmailLoginRequestBody;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return badRequest("Email is required");
  }

  if (body.code !== undefined) {
    if (typeof body.code !== "string" || !body.code.trim()) {
      return badRequest("Code is required");
    }

    try {
      const verified = await verifySavedEmailLoginCode(body.email, body.code);

      if (!verified) {
        return unauthorized("Invalid or expired email authentication code");
      }

      const user = await getOrCreateUser(body.email);
      const session = await createUserSession(user);
      const response = apiResponse(
        200,
        "email authentication verified",
        session.user,
      );

      setSessionCookie(response, session);

      return response;
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid email address") {
        return badRequest(error.message);
      }

      console.error("Failed to verify email authentication code", error);

      return serverError("Failed to verify email authentication code");
    }
  }

  try {
    const data = await getOrCreateEmailLoginCode(body.email);

    return apiResponse(200, "email authentication code sent", data);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid email address") {
      return badRequest(error.message);
    }

    console.error("Failed to send email authentication code", error);

    return serverError("Failed to send email authentication code");
  }
}
