"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useUser } from "@/app/providers/UserProvider";
import type { ApiResponseBody } from "@/lib/api-response";
import type { AvalonGameConfig, AvalonGameStatus } from "@/types/avalon";

type ActiveAvalonTable = {
  id: string;
  name: string;
  status: Extract<AvalonGameStatus, "lobby" | "inProgress">;
  playerCount: AvalonGameConfig["playerCount"];
  isCreator: boolean;
};

const refreshIntervalMs = 15_000;

export default function ActiveAvalonTableLink() {
  const pathname = usePathname();
  const { isCheckingUser, user } = useUser();
  const [table, setTable] = useState<ActiveAvalonTable | null>(null);

  const refreshTable = useCallback(async () => {
    if (!user) {
      setTable(null);
      return;
    }

    try {
      const response = await fetch("/api/games/avalon/active", {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponseBody<ActiveAvalonTable | null>;

      setTable(response.ok ? result.data : null);
    } catch {
      setTable(null);
    }
  }, [user]);

  useEffect(() => {
    if (isCheckingUser) {
      return;
    }

    void refreshTable();
  }, [isCheckingUser, pathname, refreshTable]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshTable();
      }
    }, refreshIntervalMs);
    const handleFocus = () => void refreshTable();

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshTable, user]);

  if (!table) {
    return null;
  }

  const isCurrentTable = pathname === `/games/avalon/tables/${table.id}`;
  const statusLabel = table.status === "inProgress" ? "در حال بازی" : "لابی";

  return (
    <Link
      href={`/games/avalon/tables/${table.id}`}
      aria-current={isCurrentTable ? "page" : undefined}
      className={`btn btn-sm h-full min-h-0 gap-1 px-2 ${
        isCurrentTable ? "btn-primary" : "btn-warning btn-outline"
      }`}
      title={`ورود سریع به ${table.name} (${statusLabel}، ${table.playerCount} نفره)`}
    >
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      <span className="hidden max-w-28 truncate sm:inline">{table.name}</span>
      <span className="hidden lg:inline text-xs opacity-70">· {statusLabel}</span>
    </Link>
  );
}
