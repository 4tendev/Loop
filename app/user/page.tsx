"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useUser } from "@/app/providers/UserProvider";
import type { ApiUser } from "@/types/user";

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

export default function Dashboard() {
  const { isCheckingUser, setUser, user } = useUser();
  const [name, setName] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? "");
    setProfileImageFile(null);
  }, [user]);

  const trimmedName = name.trim();
  const canSaveName = !!user && !!trimmedName && trimmedName !== user.name && !isSaving;
  const canSaveImage = !!user && !!profileImageFile && !isSaving;

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

  async function updateProfileImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSaveImage || !profileImageFile) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("profileImage", profileImageFile);

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
      setProfileImageFile(null);
      setSuccess("تصویر پروفایل به‌روزرسانی شد.");
    } catch {
      setError("به‌روزرسانی تصویر انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsSaving(false);
    }
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
                اطلاعات پروفایل خود را ببینید و نام نمایشی یا تصویر پروفایل را تغییر دهید.
              </p>
            </div>

            <div className="grid gap-3 rounded-box border border-base-300 bg-base-200/60 p-4 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-4">
                <div className="avatar">
                  <div className="w-20 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100">
                    <Image
                      alt={user.name}
                      src={user.profileImage || "/avatar.png"}
                      width={80}
                      height={80}
                      className="rounded-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-base-content/60">تصویر پروفایل</p>
                  <p className="break-all font-medium" dir="ltr">
                    {user.profileImage}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-base-content/60">شناسه کاربر</p>
                <p className="break-all text-left font-medium" dir="ltr">
                  {user.id}
                </p>
              </div>
              <div>
                <p className="text-base-content/60">نوع حساب</p>
                <p className="font-medium">{formatUserType(user.type)}</p>
              </div>
              <div>
                <p className="text-base-content/60">تاریخ ساخت</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-base-content/60">آخرین به‌روزرسانی</p>
                <p className="font-medium">{formatDate(user.updatedAt)}</p>
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

              <button className="btn btn-primary w-full" disabled={!canSaveName}>
                {isSaving ? <span className="loading loading-spinner loading-sm" /> : null}
                ذخیره نام
              </button>
            </form>

            <form className="flex flex-col gap-5" onSubmit={updateProfileImage}>
              <label className="flex w-full flex-col gap-2">
                <span className="label-text">تصویر پروفایل</span>
                <input
                  accept="image/*"
                  className="file-input file-input-bordered w-full"
                  disabled={isSaving}
                  onChange={(event) => {
                    setProfileImageFile(event.target.files?.[0] ?? null);
                    setError(null);
                    setSuccess(null);
                  }}
                  type="file"
                />
              </label>

              <button className="btn btn-secondary w-full" disabled={!canSaveImage}>
                {isSaving ? <span className="loading loading-spinner loading-sm" /> : null}
                ذخیره تصویر
              </button>
            </form>

            {error ? <p className="text-sm text-error">{error}</p> : null}
            {success ? <p className="text-sm text-success">{success}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
