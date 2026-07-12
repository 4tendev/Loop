"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/app/providers/UserProvider";
import { getProfileImageSrc } from "@/lib/profile-image";
import type { ApiUser } from "@/types/user";
import type { AuthProvider } from "@/types/user";

type ApiAuthMethod = { id: string; provider: AuthProvider; providerUserId: string; createdAt: string; lastUsedAt: string | null };
const providerLabels: Partial<Record<AuthProvider, string>> = { email: "ایمیل", telegram: "تلگرام", device: "دستگاه" };

type UpdateUserResponse = {
  code: number;
  message: string;
  data: ApiUser | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatUserType(type: ApiUser["type"]) {
  return type === "admin" ? "مدیر" : "عضو";
}

async function preprocessProfileImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const image = new window.Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = objectUrl;
    });

    const size = 400;
    const sourceSize = Math.max(1, Math.min(image.width, image.height));
    const sourceX = Math.max(0, Math.floor((image.width - sourceSize) / 2));
    const sourceY = Math.max(0, Math.floor((image.height - sourceSize) / 2));

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas not supported");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );

    const pixelStep = 8;
    const tinyCanvas = document.createElement("canvas");
    tinyCanvas.width = Math.max(1, Math.round(size / pixelStep));
    tinyCanvas.height = Math.max(1, Math.round(size / pixelStep));

    const tinyContext = tinyCanvas.getContext("2d");
    if (!tinyContext) {
      throw new Error("Canvas not supported");
    }

    tinyContext.imageSmoothingEnabled = false;
    tinyContext.drawImage(canvas, 0, 0, tinyCanvas.width, tinyCanvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, size, size);
    context.drawImage(
      tinyCanvas,
      0,
      0,
      tinyCanvas.width,
      tinyCanvas.height,
      0,
      0,
      size,
      size,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.99),
    );
    if (!blob) {
      throw new Error("Failed to export image");
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function Dashboard() {
  const { isCheckingUser, setUser, user } = useUser();
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authMethods, setAuthMethods] = useState<ApiAuthMethod[]>([]);

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/auth-methods", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((result: { data: ApiAuthMethod[] | null }) => setAuthMethods(result.data ?? []))
      .catch(() => setError("دریافت روش‌های ورود انجام نشد."));
  }, [user]);

  const trimmedName = name.trim();
  const canSaveName =
    !!user && !!trimmedName && trimmedName !== user.name && !isSaving;

  async function updateName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSaveName) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });
      const result = (await response.json()) as UpdateUserResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "به‌روزرسانی نام انجام نشد.");
        return;
      }

      setUser(result.data);
      setName(result.data.name);
      setSuccess("نام به‌روزرسانی شد.");
    } catch {
      setError("به‌روزرسانی نام انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateProfileImage(file: File) {
    if (!user || isSaving) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const processedFile = await preprocessProfileImage(file);
      const formData = new FormData();
      formData.append("profileImage", processedFile);

      const response = await fetch("/api/user", {
        method: "PATCH",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as UpdateUserResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "به‌روزرسانی تصویر انجام نشد.");
        return;
      }

      setUser(result.data);
      setSuccess("تصویر پروفایل به‌روزرسانی شد.");
    } catch {
      setError("به‌روزرسانی تصویر انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsSaving(false);
    }
  }

  function openProfileImagePicker() {
    profileImageInputRef.current?.click();
  }

  if (isCheckingUser) {
    return (
      <main className="min-h-full bg-base-200 px-4 py-10">
        <section className="mx-auto flex min-h-full w-full max-w-2xl items-center">
          <div className="card w-full bg-base-100 shadow-xl">
            <div className="card-body items-center gap-4 py-14">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-full bg-base-200 px-4 py-10">
        <section className="mx-auto flex min-h-full w-full max-w-md items-center">
          <div className="card w-full bg-base-100 shadow-xl">
            <div className="card-body gap-5">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">حساب کاربری</h1>
                <p className="text-sm text-base-content/70">
                  برای دیدن و ویرایش اطلاعات حساب خود وارد شوید.
                </p>
              </div>

              <Link className="btn btn-primary w-full" href="/auth">
                ورود
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-base-200 px-4 py-10">
      <section className="mx-auto flex min-h-full w-full max-w-2xl items-center">
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body gap-7">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">حساب کاربری</h1>
              <p className="text-sm text-base-content/70">
                اطلاعات پروفایل خود را ببینید و نام نمایشی یا تصویر پروفایل را
                تغییر دهید.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-box border border-base-300 bg-base-200/60 p-4">
              <div className="relative">
                <div className="avatar">
                  <div className="w-20 rounded-full">
                    <Image
                      alt={user.name}
                      src={getProfileImageSrc(user.profileImage)}
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full bg-base-100 text-base-content/70 shadow-md transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={openProfileImagePicker}
                  disabled={isSaving}
                  aria-label="ویرایش تصویر پروفایل"
                >
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487a2.25 2.25 0 0 1 3.182 3.182L8.62 19.093a4.5 4.5 0 0 1-1.897 1.13l-3.01.89.89-3.01a4.5 4.5 0 0 1 1.13-1.897L16.862 4.487z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 6l3 3"
                    />
                  </svg>
                </button>
              </div>
              <div>
                <p className="text-base font-medium">{user.name}</p>
                <p className="text-sm text-base-content/60">
                  {formatUserType(user.type)}
                </p>
              </div>
            </div>

            <form className="flex flex-col gap-5" onSubmit={updateName}>
              <label className="flex w-full flex-col gap-2">
                <span className="label-text">نام</span>
                <input
                  className="input input-bordered w-full"
                  disabled={isSaving}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder="نام شما"
                  type="text"
                  value={name}
                />
              </label>

              <button
                className="btn btn-primary w-full"
                disabled={!canSaveName}
              >
                {isSaving ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : null}
                ذخیره نام
              </button>
            </form>

            <div className="divider my-0" />
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">روش‌های ورود</h2>
                <p className="text-sm text-base-content/60">روش‌های متصل به حساب و گزینه‌های ورود جدید</p>
              </div>
              <div className="space-y-2">
                {authMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between rounded-box border border-base-300 p-3">
                    <div>
                      <p className="font-medium">{providerLabels[method.provider] ?? method.provider}</p>
                      <bdi className="text-xs text-base-content/60">{method.provider === "device" ? `${method.providerUserId.slice(0, 8)}…` : method.providerUserId}</bdi>
                    </div>
                    <span className="badge badge-success badge-outline">متصل</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["email", "telegram", "device"] as const).filter((provider) => !authMethods.some((method) => method.provider === provider)).map((provider) => (
                  <Link key={provider} href={`/auth?link=1&method=${provider}`} className="btn btn-outline btn-sm">افزودن {providerLabels[provider]}</Link>
                ))}
              </div>
            </section>

            <input
              ref={profileImageInputRef}
              accept="image/*"
              className="hidden"
              disabled={isSaving}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";

                if (!file) {
                  return;
                }

                await updateProfileImage(file);
              }}
              type="file"
            />

            {error ? <p className="text-sm text-error">{error}</p> : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
