"use client";

import { useEffect, useState } from "react";

import type { ApiResponseBody } from "@/lib/api-response";
import { getProfileImageSrc } from "@/lib/profile-image";
import type { AvalonWsSeat } from "./types";

type Player = NonNullable<AvalonWsSeat["player"]>;

type PlayerStats = {
  gamesTogether: number;
  sameSide: { games: number; wins: number; winRate: number };
  oppositeSide: { games: number; wins: number; winRate: number };
};

type AvalonPlayerProfileModalProps = {
  player: Player;
  onClose: () => void;
};

function formatRate(value: number) {
  return `${value.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

export function AvalonPlayerProfileModal({
  player,
  onClose,
}: AvalonPlayerProfileModalProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch(
          `/api/games/avalon/player-stats?playerId=${encodeURIComponent(player.id)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result =
          (await response.json()) as ApiResponseBody<PlayerStats | null>;

        if (!response.ok || !result.data) throw new Error(result.message);
        setStats(result.data);
        setError(null);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "دریافت آمار بازیکن انجام نشد",
        );
      }
    })();

    return () => {
      controller.abort();
    };
  }, [player.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      aria-labelledby="avalon-player-profile-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
      dir="rtl"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-primary/30 bg-base-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-gradient-to-b from-primary/20 to-base-100 px-5 pb-4 pt-7 text-center">
          <button
            aria-label="بستن پروفایل بازیکن"
            className="btn btn-circle btn-ghost btn-sm absolute left-3 top-3"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
          <img
            alt={player.name}
            className="mx-auto h-36 w-36 rounded-full border-4 border-base-100 object-cover shadow-xl"
            src={getProfileImageSrc(player.profileImage)}
          />
          <h2 className="mt-3 truncate text-xl font-black" id="avalon-player-profile-title">
            {player.name}
          </h2>
          <span
            className={`badge mt-2 ${player.isOnline ? "badge-success" : "badge-ghost"}`}
          >
            {player.isOnline ? "آنلاین" : "آفلاین"}
          </span>
        </div>

        <div className="p-4">
          {!stats && !error ? (
            <div className="flex min-h-40 items-center justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : error ? (
            <p className="rounded-lg border border-error/30 bg-error/10 p-4 text-center text-sm text-error">
              {error}
            </p>
          ) : stats ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
                <span className="text-sm font-bold">بازی‌های کامل مشترک با شما</span>
                <span className="text-2xl font-black text-primary">
                  {stats.gamesTogether.toLocaleString("fa-IR")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center">
                  <p className="text-xs font-black text-success">هم‌تیمی</p>
                  <p className="mt-2 text-2xl font-black">
                    {stats.sameSide.games.toLocaleString("fa-IR")}
                  </p>
                  <p className="mt-1 text-xs text-base-content/60">
                    {stats.sameSide.wins.toLocaleString("fa-IR")} برد · نرخ برد {formatRate(stats.sameSide.winRate)}
                  </p>
                </div>

                <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-center">
                  <p className="text-xs font-black text-error">حریف</p>
                  <p className="mt-2 text-2xl font-black">
                    {stats.oppositeSide.games.toLocaleString("fa-IR")}
                  </p>
                  <p className="mt-1 text-xs text-base-content/60">
                    {stats.oppositeSide.wins.toLocaleString("fa-IR")} برد · نرخ برد {formatRate(stats.oppositeSide.winRate)}
                  </p>
                </div>
              </div>

              <p className="text-center text-[0.65rem] leading-5 text-base-content/50">
                نرخ برد از دید شما و فقط بر اساس بازی‌های کامل محاسبه شده است.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
