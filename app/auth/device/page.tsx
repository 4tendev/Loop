"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/app/providers/UserProvider";
import type { ApiUser } from "@/types/user";

const deviceStorageKey = "loop.auth.deviceCredential.v2";

type DeviceLoginResponse = {
  code: number;
  message: string;
  data: ApiUser | null;
};

export default function DeviceAuth({ linking = false }: { linking?: boolean }) {
  const router = useRouter();
  const { setUser } = useUser();
  const [deviceId, setDeviceId] = useState<string | null>();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNewDevice = deviceId === null;

  useEffect(() => {
    setDeviceId(window.localStorage.getItem(deviceStorageKey));
  }, []);

  async function authenticateWithDevice() {
    if (deviceId === undefined) {
      return;
    }

    const trimmedName = name.trim();

    if (isNewDevice && !linking && !trimmedName) {
      setError("نام خود را وارد کنید.");
      return;
    }

    const authenticationDeviceId = deviceId ?? window.crypto.randomUUID();

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
          deviceId: authenticationDeviceId,
          name: isNewDevice && !linking ? trimmedName : undefined,
          link: linking,
        }),
      });
      const result = (await response.json()) as DeviceLoginResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "ورود با دستگاه انجام نشد.");
        return;
      }

      if (isNewDevice) {
        window.localStorage.setItem(deviceStorageKey, authenticationDeviceId);
        setDeviceId(authenticationDeviceId);
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
          {linking
            ? "این مرورگر را برای ورود سریع به حساب فعلی متصل کنید."
            : isNewDevice
              ? "نام خود را وارد کنید و از این مرورگر برای ورود سریع استفاده کنید."
              : "با دستگاه ذخیره‌شده وارد حساب خود شوید."}
        </p>
      </div>

      {isNewDevice && !linking ? (
        <label className="form-control w-full">
          <span className="label-text mb-2">نام شما</span>
          <input
            autoComplete="name"
            className="input input-bordered w-full"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="نام خود را وارد کنید"
            required
            type="text"
            value={name}
          />
        </label>
      ) : null}

      <button
        className="btn btn-primary w-full"
        disabled={
          isSubmitting ||
          deviceId === undefined ||
          (isNewDevice && !linking && !name.trim())
        }
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
