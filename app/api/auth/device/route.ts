import { NextRequest } from "next/server";
import { apiResponse, badRequest, serverError } from "@/lib/api-response";
import { getOrCreateDeviceUser } from "@/lib/auth/device";
import { createUserSession, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type DeviceLoginRequestBody = {
  deviceId?: unknown;
  deviceName?: unknown;
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
    if (error instanceof Error && error.message === "Invalid device id") {
      return badRequest("شناسه دستگاه نامعتبر است");
    }

    console.error("Failed to authenticate device", error);

    return serverError("ورود با دستگاه انجام نشد");
  }
}
