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

function formatTimeLeft(timeLeftMs: number) {
  const totalSeconds = Math.max(Math.ceil(timeLeftMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function EmailAuth() {
  const router = useRouter();
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(() => Array(codeLength).fill(""));
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
        setError(result.message || "Could not send the authentication code.");
        return;
      }

      setTimeLeftMs(result.data.timeLeftMs);
      setCode(Array(codeLength).fill(""));
      window.setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
    } catch {
      setError("Could not send the authentication code. Please try again.");
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
        body: JSON.stringify({ email, code: loginCode }),
      });
      const result = (await response.json()) as EmailLoginResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "Could not authenticate you.");
        return;
      }

      setUser(result.data);
      router.push("/user");
      router.refresh();
    } catch {
      setError("Could not authenticate you. Please try again.");
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

  return (
    <main className="min-h-full bg-base-200 px-4 py-10">
      <section className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="card w-full bg-base-100 shadow-xl">
          <div className="card-body gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">
                Authenticate with email
              </h1>
              <p className="text-sm text-base-content/70">
                {hasRequestedCode
                  ? `Enter the code sent to ${email}.`
                  : "We will send a one-time authentication code to your inbox."}
              </p>
            </div>

            <form className="flex flex-col gap-5" onSubmit={requestLoginCode}>
              <label className="flex w-full flex-col gap-2">
                <span className="label-text">Email</span>
                <input
                  className="input input-bordered w-full"
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
                  Send code
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
                  Send new code
                </button>
              )}
            </form>

            {hasRequestedCode ? (
              <form className="flex flex-col gap-5" onSubmit={verifyLoginCode}>
                <div className="flex justify-between gap-3 text-sm text-base-content/70">
                  <span>One-time code</span>
                  <span>{formatTimeLeft(timeLeftMs)} left</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {code.map((digit, index) => (
                    <input
                      aria-label={`Code digit ${index + 1}`}
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
                  Authenticate
                </button>
              </form>
            ) : null}

            {error ? <p className="text-sm text-error">{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
