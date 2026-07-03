import { NextRequest } from "next/server";
import { apiResponse, unauthorized } from "@/lib/api-response";
import { getUserSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function unknownUser() {
  return unauthorized("unknown user");
}

export async function GET(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);

  if (!session) {
    return unknownUser();
  }

  return apiResponse(200, "user found", session.user);
}
