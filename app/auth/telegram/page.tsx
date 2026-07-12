"use client";

import { useEffect, useRef, useState } from "react";

type TelegramAuthProps = {
  authOrigin: string;
  botUsername: string;
  linking?: boolean;
};

function getTelegramAuthUrl(authOrigin: string, linking: boolean) {
  const trimmedOrigin = authOrigin.trim().replace(/\/+$/, "");
  const origin = trimmedOrigin || window.location.origin;

  const url = new URL("/api/auth/telegram", origin);
  if (linking) url.searchParams.set("link", "1");
  return url.toString();
}

export default function TelegramAuth({
  authOrigin,
  botUsername,
  linking = false,
}: TelegramAuthProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [widgetStatus, setWidgetStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !botUsername) {
      return;
    }

    setWidgetStatus("loading");
    container.innerHTML = "";

    let readyTimeout: number | undefined;

    const revealWidget = () => {
      if (readyTimeout) {
        window.clearTimeout(readyTimeout);
      }

      readyTimeout = window.setTimeout(() => setWidgetStatus("ready"), 300);
    };

    const markReadyWhenWidgetIsVisible = () => {
      const iframe = container.querySelector("iframe");

      if (!iframe) {
        return;
      }

      const confirmVisibleSize = () => {
        window.requestAnimationFrame(() => {
          const { height, width } = iframe.getBoundingClientRect();

          if (width > 0 && height > 0) {
            revealWidget();
          }
        });
      };

      iframe.addEventListener("load", confirmVisibleSize, { once: true });
      confirmVisibleSize();
    };

    const observer = new MutationObserver(markReadyWhenWidgetIsVisible);
    observer.observe(container, { childList: true, subtree: true });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-auth-url", getTelegramAuthUrl(authOrigin, linking));
    script.setAttribute("data-request-access", "write");
    script.onload = markReadyWhenWidgetIsVisible;
    script.onerror = () => setWidgetStatus("error");

    container.appendChild(script);

    return () => {
      observer.disconnect();
      if (readyTimeout) {
        window.clearTimeout(readyTimeout);
      }
      container.innerHTML = "";
    };
  }, [authOrigin, botUsername, linking]);

  if (!botUsername) {
    return (
      <div className="alert alert-warning text-sm">
        ورود با تلگرام هنوز پیکربندی نشده است.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid min-h-12 w-full place-items-center">
        <div
          ref={containerRef}
          className={`col-start-1 row-start-1 flex min-h-12 justify-center transition-opacity ${
            widgetStatus === "ready"
              ? "visible opacity-100"
              : "invisible pointer-events-none opacity-0"
          }`}
        />
        {widgetStatus === "loading" ? (
          <div
            className="btn btn-outline btn-primary col-start-1 row-start-1 w-full max-w-xs cursor-wait justify-center gap-2"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="loading loading-spinner loading-sm" />
            <span>در حال اتصال به تلگرام...</span>
          </div>
        ) : null}
        {widgetStatus === "error" ? (
          <div className="alert alert-error col-start-1 row-start-1 justify-center text-center text-sm">
            بارگذاری ورود با تلگرام ناموفق بود. دوباره تلاش کنید.
          </div>
        ) : null}
      </div>
      <p className="text-center text-sm text-base-content/70">
        در تلگرام ادامه دهید؛ سپس به حساب خود بازمی‌گردید. مطمئن شوید وی‌پی‌ان روشن است.
      </p>
    </div>
  );
}
