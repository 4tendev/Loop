import { randomUUID } from "node:crypto";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import * as BunnyStorageSDK from "@bunny.net/storage-sdk";

const BUNNY_STORAGE_ZONE_NAME = process.env.storageZoneName;
const BUNNY_STORAGE_ACCESS_KEY = process.env.PRIVATE_BUNNY_ACCESSKEY;
const BUNNY_STORAGE_REGION = BunnyStorageSDK.regions.StorageRegion.Falkenstein;
const BUNNY_CDN_HOST = BUNNY_STORAGE_ZONE_NAME ? `${BUNNY_STORAGE_ZONE_NAME}.b-cdn.net` : "";
const bunnyStorageZone =
  BUNNY_STORAGE_ZONE_NAME && BUNNY_STORAGE_ACCESS_KEY
    ? BunnyStorageSDK.zone.connect_with_accesskey(
        BUNNY_STORAGE_REGION,
        BUNNY_STORAGE_ZONE_NAME,
        BUNNY_STORAGE_ACCESS_KEY,
      )
    : null;

function getImageExtension(file: File) {
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";

  return "";
}

export async function saveBunnyProfileImage(file: File) {
  if (!bunnyStorageZone || !BUNNY_STORAGE_ZONE_NAME) {
    throw new Error("Bunny storage is not configured");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid image file");
  }

  const extension = getImageExtension(file);

  if (!extension) {
    throw new Error("Unsupported image file type");
  }

  const filename = `${randomUUID()}${extension}`;
  const bunnyPath = `/profile-images/${filename}`;

  await BunnyStorageSDK.file.upload(
    bunnyStorageZone,
    bunnyPath,
    file.stream() as unknown as NodeReadableStream<Uint8Array<ArrayBufferLike>>,
    {
      contentType: file.type,
    },
  );

  return `https://${BUNNY_CDN_HOST}${bunnyPath}`;
}
