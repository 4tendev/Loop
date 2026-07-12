"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import DeviceAuth from "./device/page";
import EmailAuth from "./email/page";
import TelegramAuth from "./telegram/page";

type AuthMethod = "email" | "telegram" | "device";

type AuthClientProps = {
  telegramAuthOrigin: string;
  telegramBotUsername: string;
};

export default function AuthClient({
  telegramAuthOrigin,
  telegramBotUsername,
}: AuthClientProps) {
  const searchParams = useSearchParams();
  const telegramError = searchParams.get("telegramError");
  const linking = searchParams.get("link") === "1";
  const requestedMethod = searchParams.get("method");
  const [method, setMethod] = useState<AuthMethod>(
    telegramError || requestedMethod === "telegram"
      ? "telegram"
      : requestedMethod === "device"
        ? "device"
        : "email",
  );

  return (
    <main className="min-h-full bg-base-200 px-4 py-10" dir="rtl" lang="fa">
      <section className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">ورود</h1>
              <p className="text-sm text-base-content/70">
                روش ورود به حساب خود را انتخاب کنید.
              </p>
            </div>

            <div dir="ltr" className="join grid grid-cols-3">
              <button
                className={`btn join-item ${method === "email" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMethod("email")}
                type="button"
              >
                ایمیل
              </button>
              <button
                className={`btn join-item ${method === "telegram" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMethod("telegram")}
                type="button"
              >
                تلگرام
              </button>
              <button
                className={`btn join-item ${method === "device" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMethod("device")}
                type="button"
              >
                دستگاه
              </button>
            </div>

            {method === "email" ? (
              <EmailAuth embedded linking={linking} />
            ) : method === "telegram" ? (
              <TelegramAuth
                authOrigin={telegramAuthOrigin}
                botUsername={telegramBotUsername}
                linking={linking}
              />
            ) : (
              <DeviceAuth linking={linking} />
            )}

            {telegramError ? (
              <p className="text-sm text-error">{telegramError}</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
