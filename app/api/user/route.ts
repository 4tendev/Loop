import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  apiResponse,
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import {
  getUserSessionFromRequest,
  updateUserSession,
} from "@/lib/auth/session";
import { getPostgresPool } from "@/lib/postgres";
import type { User } from "@/types/user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type UserRow = {
  id: string;
  profileImage: string;
  name: string;
  type: User["type"];
  createdAt: Date;
  updatedAt: Date;
};

function unknownUser() {
  return unauthorized("کاربر پیدا نشد");
}

function getImageExtension(file: File) {
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";

  return "";
}

async function saveProfileImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid image file");
  }

  const extension = getImageExtension(file);

  if (!extension) {
    throw new Error("Unsupported image file type");
  }

  const uploadsDir = path.join(process.cwd(), "public", "profile-images");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const destination = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(destination, buffer);

  return `/profile-images/${filename}`;
}

export async function GET(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);

  if (!session) {
    return unknownUser();
  }

  return apiResponse(200, "کاربر پیدا شد", session.user);
}

export async function PATCH(request: NextRequest) {
  const session = await getUserSessionFromRequest(request);

  if (!session) {
    return unknownUser();
  }

  let name: string | undefined;
  let profileImage: string | undefined;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const formName = formData.get("name");
      const file = formData.get("profileImage");

      if (typeof formName === "string") {
        name = formName.trim();
      }

      if (file instanceof File && file.size > 0) {
        profileImage = await saveProfileImage(file);
      }
    } else {
      const body = (await request.json()) as {
        name?: unknown;
        profileImage?: unknown;
      };

      if (typeof body.name === "string") {
        name = body.name.trim();
      }

      if (typeof body.profileImage === "string") {
        profileImage = body.profileImage.trim();
      }
    }
  } catch {
    return badRequest("بدنه درخواست نامعتبر است");
  }

  if (name !== undefined && !name) {
    return badRequest("نام الزامی است");
  }

  if (profileImage !== undefined && !profileImage) {
    return badRequest("تصویر الزامی است");
  }

  if (name === undefined && profileImage === undefined) {
    return badRequest("حداقل یک فیلد باید ارسال شود");
  }

  const pool = getPostgresPool();

  try {
    const result = await pool.query<UserRow>(
      `
        UPDATE users
        SET
          name = COALESCE($1, name),
          profile_image = COALESCE($2, profile_image)
        WHERE id = $3
        RETURNING
          id,
          profile_image AS "profileImage",
          name,
          type,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [name ?? null, profileImage ?? null, session.user.id],
    );
    const user = result.rows[0];

    if (!user) {
      return unknownUser();
    }

    const updatedSession = await updateUserSession(session, user);

    return apiResponse(200, "کاربر به‌روزرسانی شد", updatedSession.user);
  } catch (error) {
    console.error("Failed to update user", error);

    return serverError("به‌روزرسانی کاربر انجام نشد");
  }
}
