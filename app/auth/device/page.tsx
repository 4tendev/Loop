"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/app/providers/UserProvider";
import type { ApiUser } from "@/types/user";

const deviceStorageKey = "loop.auth.deviceId";

type DeviceLoginResponse = {
  code: number;
  message: string;
  data: ApiUser | null;
};

function getDeviceName() {
  const platform = navigator.platform;

  return platform ? `دستگاه ${platform}` : "این دستگاه";
}

function getOrCreateDeviceId() {
  const savedDeviceId = window.localStorage.getItem(deviceStorageKey);

  if (savedDeviceId) {
    return savedDeviceId;
  }

  const deviceId = window.crypto.randomUUID();
  window.localStorage.setItem(deviceStorageKey, deviceId);

  return deviceId;
}

export default function DeviceAuth() {
  const router = useRouter();
  const { setUser } = useUser();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shortDeviceId = useMemo(
    () => (deviceId ? deviceId.slice(0, 8).toUpperCase() : ""),
    [deviceId],
  );

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  async function authenticateWithDevice() {
    if (!deviceId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/device", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId,
          deviceName: getDeviceName(),
        }),
      });
      const result = (await response.json()) as DeviceLoginResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "ورود با دستگاه انجام نشد.");
        return;
      }

      setUser(result.data);
      router.push("/user");
      router.refresh();
    } catch {
      setError("ورود با دستگاه انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">ورود با دستگاه</h2>
        <p className="text-sm text-base-content/70">
          از این مرورگر به عنوان دستگاه ذخیره‌شده برای ورود سریع استفاده کنید.
        </p>
      </div>

      {shortDeviceId ? (
        <div className="rounded-box border border-base-300 bg-base-200/60 p-4 text-sm">
          <span className="text-base-content/70">کد دستگاه </span>
          <bdi className="font-mono font-semibold">{shortDeviceId}</bdi>
        </div>
      ) : null}

      <button
        className="btn btn-primary w-full"
        disabled={isSubmitting || !deviceId}
        onClick={authenticateWithDevice}
        type="button"
      >
        {isSubmitting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : null}
        ورود با دستگاه
      </button>

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
