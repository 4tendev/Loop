import { NextResponse } from "next/server";

export type ApiResponseBody<T> = {
  code: number;
  message: string;
  data: T;
};

export function apiResponse<T>(
  code: number,
  message: string,
  data: T,
  init?: ResponseInit,
) {
  return NextResponse.json<ApiResponseBody<T>>(
    {
      code,
      message,
      data,
    },
    init,
  );
}

export function badRequest(message: string) {
  return apiResponse(400, message, null, { status: 400 });
}

export function unauthorized(message: string) {
  return apiResponse(401, message, null, { status: 401 });
}

export function serverError(message: string) {
  return apiResponse(500, message, null, { status: 500 });
}
