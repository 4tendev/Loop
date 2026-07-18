import type { AvalonGameStatus } from "@/types/avalon";

import type { ConnectionStatus } from "./types";

export const statusLabels: Record<AvalonGameStatus, string> = {
  lobby: "لابی",
  inProgress: "در حال بازی",
  completed: "تمام‌شده",
  cancelled: "لغوشده",
};

export const statusClasses: Record<AvalonGameStatus, string> = {
  lobby: "badge-info",
  inProgress: "badge-success",
  completed: "badge-neutral",
  cancelled: "badge-error",
};

export const connectionLabels: Record<ConnectionStatus, string> = {
  syncing: "در حال همگام‌سازی",
  connecting: "در حال اتصال",
  connected: "زنده",
  disconnected: "قطع شده",
  error: "خطا",
};

export function getAvalonWsUrl(tableId?: string) {
  const query = tableId ? `?gameId=${encodeURIComponent(tableId)}` : "";

  if (process.env.NEXT_PUBLIC_AVALON_WS_URL) {
    return `${process.env.NEXT_PUBLIC_AVALON_WS_URL}${query}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const isDevelopment = process.env.NODE_ENV === "development";
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const host = isDevelopment && isLocalHost
    ? `${window.location.hostname}:3001`
    : window.location.host;

  return `${protocol}//${host}/ws/avalon/games${query}`;
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
