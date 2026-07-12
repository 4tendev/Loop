import { NextRequest } from "next/server";
import { apiResponse, badRequest, serverError } from "@/lib/api-response";
import { getOrCreateDeviceUser } from "@/lib/auth/device";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";
import { getUserSessionFromRequest } from "@/lib/auth/session";
import { AuthMethodAlreadyLinkedError, linkAuthMethod } from "@/lib/auth/link-method";
import { createDeviceProviderUserId, deviceAuthProvider } from "@/lib/auth/device";
import { getPostgresPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

type DeviceLoginRequestBody = {
  deviceId?: unknown;
  deviceName?: unknown;
  link?: unknown;
};

export async function POST(request: NextRequest) {
  let body: DeviceLoginRequestBody;

  try {
    body = await request.json();
  } catch {
    return badRequest("بدنه درخواست نامعتبر است");
  }

  if (typeof body.deviceId !== "string" || !body.deviceId.trim()) {
    return badRequest("شناسه دستگاه الزامی است");
  }

  if (body.deviceName !== undefined && typeof body.deviceName !== "string") {
    return badRequest("نام دستگاه باید متن باشد");
  }

  try {
    if (body.link === true) {
      const currentSession = await getUserSessionFromRequest(request);
      if (!currentSession) return badRequest("ابتدا وارد حساب خود شوید");
      await linkAuthMethod(getPostgresPool(), currentSession.user.id, deviceAuthProvider, createDeviceProviderUserId(body.deviceId));
      return apiResponse(200, "دستگاه به حساب اضافه شد", currentSession.user);
    }
    const user = await getOrCreateDeviceUser(body.deviceId, body.deviceName);
    const session = await createUserSession(user);
    const response = apiResponse(
      200,
      "ورود با دستگاه تایید شد",
      session.user,
    );

    setSessionCookie(response, session);

    return response;
  } catch (error) {
    if (error instanceof AuthMethodAlreadyLinkedError) return badRequest("این دستگاه به حساب دیگری متصل است");
    if (error instanceof Error && error.message === "Invalid device id") {
      return badRequest("شناسه دستگاه نامعتبر است");
    }

    console.error("Failed to authenticate device", error);

    return serverError("ورود با دستگاه انجام نشد");
  }
}
