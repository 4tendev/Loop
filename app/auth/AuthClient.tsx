"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import EmailAuth from "./email/page";
import TelegramAuth from "./TelegramAuth";

type AuthMethod = "email" | "telegram";

type AuthClientProps = {
  telegramBotUsername: string;
};

export default function AuthClient({ telegramBotUsername }: AuthClientProps) {
  const searchParams = useSearchParams();
  const telegramError = searchParams.get("telegramError");
  const [method, setMethod] = useState<AuthMethod>(
    telegramError ? "telegram" : "email",
  );

  return (
    <main className="min-h-full bg-base-200 px-4 py-10">
      <section className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Sign in</h1>
              <p className="text-sm text-base-content/70">
                Choose how you want to authenticate.
              </p>
            </div>

            <div className="join grid grid-cols-2">
              <button
                className={`btn join-item ${method === "email" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMethod("email")}
                type="button"
              >
                Email
              </button>
              <button
                className={`btn join-item ${method === "telegram" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setMethod("telegram")}
                type="button"
              >
                Telegram
              </button>
            </div>

            {method === "email" ? (
              <EmailAuth embedded />
            ) : (
              <TelegramAuth botUsername={telegramBotUsername} />
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
