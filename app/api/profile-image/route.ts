import { NextRequest } from "next/server";

import { isAllowedBunnyProfileImageUrl } from "@/lib/profile-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl || !isAllowedBunnyProfileImageUrl(imageUrl)) {
    return new Response("Invalid profile image URL", { status: 400 });
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(imageUrl, {
      cache: "force-cache",
      next: { revalidate: 86400 },
    });
  } catch {
    return new Response("Failed to load profile image", { status: 502 });
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (!upstreamResponse.ok) {
    return new Response("Failed to load profile image", {
      status: upstreamResponse.status,
    });
  }

  if (!contentType.startsWith("image/")) {
    return new Response("Invalid profile image content", { status: 415 });
  }

  return new Response(upstreamResponse.body, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": contentType,
    },
  });
}
