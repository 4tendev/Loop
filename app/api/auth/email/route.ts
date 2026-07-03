import { NextRequest, NextResponse } from "next/server";
import { getOrCreateEmailLoginCode } from "@/lib/auth/email/login-code";

export const dynamic = "force-dynamic";

type EmailLoginRequestBody = {
  email?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json(
    {
      code: 400,
      message,
      data: null,
    },
    { status: 400 },
  );
}

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

  try {
    const data = await getOrCreateEmailLoginCode(body.email);

    return NextResponse.json({
      code: 200,
      message: "email login code sent",
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid email address") {
      return badRequest(error.message);
    }

    console.error("Failed to send email login code", error);

    return NextResponse.json(
      {
        code: 500,
        message: "Failed to send email login code",
        data: null,
      },
      { status: 500 },
    );
  }
}
