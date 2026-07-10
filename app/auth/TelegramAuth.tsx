"use client";

import { useEffect, useRef } from "react";

type TelegramAuthProps = {
  authOrigin: string;
  botUsername: string;
};

export default function TelegramAuth({
  authOrigin,
  botUsername,
}: TelegramAuthProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !botUsername) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute(
      "data-auth-url",
      `${authOrigin || window.location.origin}/api/auth/telegram`,
    );
    script.setAttribute("data-request-access", "write");

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [authOrigin, botUsername]);

  if (!botUsername) {
    return (
      <div className="alert alert-warning text-sm">
        Telegram login is not configured yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="flex min-h-12 justify-center" />
      <p className="text-center text-sm text-base-content/70">
        Continue in Telegram, then you will return to your account.
      </p>
    </div>
  );
}
