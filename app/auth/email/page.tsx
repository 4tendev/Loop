"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useUser } from "@/app/providers/UserProvider";
import type { ApiUser } from "@/types/user";

const codeLength = 5;

type EmailCodeResponse = {
  code: number;
  message: string;
  data: {
    timeLeftMs: number;
  } | null;
};

type EmailLoginResponse = {
  code: number;
  message: string;
  data: ApiUser | null;
};

type EmailAuthProps = {
  embedded?: boolean;
  linking?: boolean;
};

function formatTimeLeft(timeLeftMs: number | null) {
  const totalSeconds = Math.max(Math.ceil((timeLeftMs ?? 0) / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function EmailAuth({ embedded = false, linking = false }: EmailAuthProps = {}) {
  const router = useRouter();
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(() => Array<string>(codeLength).fill(""));
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const hasRequestedCode = timeLeftMs !== null;
  const loginCode = code.join("");
  const isCodeComplete = loginCode.length === codeLength && !code.includes("");

  useEffect(() => {
    if (timeLeftMs === null || timeLeftMs <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeftMs((current) => {
        if (current === null) {
          return current;
        }

        return Math.max(current - 1000, 0);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timeLeftMs]);

  async function requestLoginCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as EmailCodeResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "امکان ارسال کد ورود وجود ندارد.");
        return;
      }

      setTimeLeftMs(result.data.timeLeftMs);
      setCode(Array(codeLength).fill(""));
      window.setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
    } catch {
      setError("امکان ارسال کد ورود وجود ندارد. دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyLoginCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/email", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: loginCode, link: linking }),
      });
      const result = (await response.json()) as EmailLoginResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "امکان ورود وجود ندارد.");
        return;
      }

      setUser(result.data);
      router.push("/user");
      router.refresh();
    } catch {
      setError("امکان ورود وجود ندارد. دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateCode(index: number, value: string) {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setCode((current) =>
        current.map((digit, digitIndex) => (digitIndex === index ? "" : digit)),
      );
      return;
    }

    setCode((current) => {
      const next = [...current];
      digits
        .slice(0, codeLength - index)
        .split("")
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      return next;
    });

    const nextIndex = Math.min(index + digits.length, codeLength - 1);
    codeInputRefs.current[nextIndex]?.focus();
  }

  function handleCodeKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Backspace" || code[index]) {
      return;
    }

    codeInputRefs.current[Math.max(index - 1, 0)]?.focus();
  }

  const content = (
    <>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">
          {linking ? "افزودن ایمیل" : "ورود با ایمیل"}
        </h2>
        <p className="text-sm text-base-content/70">
          {hasRequestedCode ? (
            <>
              کد ارسال‌شده به <bdi>{email}</bdi> را وارد کنید.
            </>
          ) : (
            linking
              ? "برای اتصال ایمیل، یک کد یک‌بارمصرف برای شما ارسال می‌کنیم."
              : "یک کد یک‌بارمصرف به ایمیل شما ارسال می‌کنیم."
          )}
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={requestLoginCode}>
        <label className="flex w-full flex-col gap-2">
          <span className="label-text">ایمیل</span>
          <input
            className="input input-bordered w-full text-left"
            dir="ltr"
            disabled={isSubmitting || hasRequestedCode}
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        {!hasRequestedCode ? (
          <button
            className="btn btn-primary w-full"
            disabled={isSubmitting || !email.trim()}
            type="submit"
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            ارسال کد
          </button>
        ) : (
          <button
            className="btn btn-ghost w-full"
            disabled={isSubmitting || (timeLeftMs ?? 0) > 0}
            type="submit"
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            ارسال کد جدید
          </button>
        )}
      </form>

      {hasRequestedCode ? (
        <form className="flex flex-col gap-5" onSubmit={verifyLoginCode}>
          <div className="flex justify-between gap-3 text-sm text-base-content/70">
            <span>کد یک‌بارمصرف</span>
            <span>{formatTimeLeft(timeLeftMs)} باقی مانده</span>
          </div>

          <div dir="ltr" className="grid grid-cols-5 gap-2">
            {code.map((digit, index) => (
              <input
                aria-label={`رقم ${index + 1} کد`}
                className="input input-bordered h-14 w-full text-center text-xl font-semibold"
                disabled={isSubmitting}
                inputMode="numeric"
                key={index}
                maxLength={codeLength}
                onChange={(event) => updateCode(index, event.target.value)}
                onKeyDown={(event) => handleCodeKeyDown(index, event)}
                ref={(element) => {
                  codeInputRefs.current[index] = element;
                }}
                type="text"
                value={digit}
              />
            ))}
          </div>

          <button
            className="btn btn-primary w-full"
            disabled={isSubmitting || !isCodeComplete}
            type="submit"
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            {linking ? "تأیید و افزودن ایمیل" : "ورود"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className="min-h-full bg-base-200 px-4 py-10" dir="rtl" lang="fa">
      <section className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body gap-6">{content}</div>
        </div>
      </section>
    </main>
  );
}
