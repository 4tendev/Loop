"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";

import type { ApiResponseBody } from "@/lib/api-response";
import { getProfileImageSrc } from "@/lib/profile-image";
import type { AvalonGameStatus, AvalonSide } from "@/types/avalon";

type FeaturedGame = {
  id: string;
  name: string;
  status: Exclude<AvalonGameStatus, "cancelled">;
  winnerSide: AvalonSide | null;
  playerCount: number;
  publicMessage: string;
  seats: Array<{
    number: number;
    playerName: string | null;
    playerProfileImage: string | null;
  }>;
};

const statusLabels = {
  lobby: "در انتظار بازیکن",
  inProgress: "در حال بازی",
  completed: "آخرین بازی تمام‌شده",
} satisfies Record<FeaturedGame["status"], string>;

export default function HomeFeaturedTable() {
  const [game, setGame] = useState<FeaturedGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadGame() {
      try {
        const response = await fetch("/api/games/avalon/featured", {
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResponseBody<FeaturedGame | null>;

        if (isActive && response.ok) {
          setGame(result.data);
        }
      } catch {
        // The empty-table state remains useful if the preview cannot be loaded.
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadGame();
    const intervalId = window.setInterval(loadGame, 30_000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-96 items-center justify-center rounded-[2rem] border border-base-content/10 bg-base-100/45 shadow-xl backdrop-blur-sm">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const playerCount = game?.playerCount ?? 8;
  const seats = game?.seats ?? Array.from({ length: playerCount }, (_, index) => ({
    number: index + 1,
    playerName: null,
    playerProfileImage: null,
  }));
  const occupiedCount = seats.filter((seat) => seat.playerName).length;

  return (
    <div className="relative h-full min-h-96 overflow-hidden rounded-[2rem] border border-base-content/10 bg-base-100/55 p-4 shadow-2xl backdrop-blur-sm sm:p-6">
      <div className="absolute inset-x-5 top-4 z-20 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{game?.name ?? "میز آوالون"}</p>
          <p className="text-[0.65rem] text-base-content/55">
            {game ? statusLabels[game.status] : "هنوز میزی ساخته نشده"}
          </p>
        </div>
        {game ? (
          <span className={`badge badge-sm ${game.status === "inProgress" ? "badge-success" : game.status === "lobby" ? "badge-warning" : "badge-neutral"}`}>
            {game.status === "inProgress" ? "زنده" : game.status === "lobby" ? "لابی" : "پایان"}
          </span>
        ) : null}
      </div>

      <div className="absolute inset-x-4 bottom-5 top-14">
        <div className="absolute left-1/2 top-1/2 h-[45%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 border-warning/35 bg-neutral shadow-[inset_0_0_0_8px_color-mix(in_oklab,var(--color-warning)_8%,transparent),0_18px_45px_color-mix(in_oklab,var(--color-neutral)_35%,transparent)]">
          <div className="absolute inset-3 flex flex-col items-center justify-center rounded-[50%] border border-neutral-content/10 px-5 text-center text-neutral-content">
            <span className="text-2xl font-black">{occupiedCount}/{playerCount}</span>
            <span className="mt-1 text-[0.65rem] text-neutral-content/60">بازیکن</span>
            {game?.status === "completed" ? (
              <span className={`badge badge-sm mt-3 ${game.winnerSide === "good" ? "badge-success" : "badge-error"}`}>
                پیروزی {game.winnerSide === "good" ? "خیر" : "شر"}
              </span>
            ) : game?.publicMessage ? (
              <p className="mt-2 line-clamp-2 max-w-40 text-[0.65rem] leading-5 text-neutral-content/70">
                {game.publicMessage}
              </p>
            ) : null}
          </div>
        </div>

        {seats.map((seat, index) => {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / seats.length;
          const style = {
            left: `${50 + Math.cos(angle) * 43}%`,
            top: `${50 + Math.sin(angle) * 43}%`,
          } as CSSProperties;

          return (
            <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" key={seat.number} style={style}>
              <div className={`grid size-11 place-items-center overflow-hidden rounded-full border-2 bg-base-200 text-xs font-black shadow-lg ${seat.playerName ? "border-primary" : "border-base-content/20 border-dashed"}`}>
                {seat.playerName ? (
                  <img className="size-full object-cover" src={getProfileImageSrc(seat.playerProfileImage)} alt="" />
                ) : seat.number}
              </div>
              {seat.playerName ? (
                <span className="mt-1 max-w-16 truncate rounded bg-base-100/90 px-1.5 py-0.5 text-[0.6rem] font-bold shadow-sm">
                  {seat.playerName}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {game ? (
        <Link href={`/games/avalon/tables/${game.id}`} aria-label={`مشاهده ${game.name}`} className="absolute inset-0 z-30 rounded-[2rem] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/60">
          <span className="sr-only">مشاهده میز</span>
        </Link>
      ) : (
        <Link href="/games/avalon/create" className="btn btn-primary btn-sm absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full">
          ساخت اولین میز
        </Link>
      )}
    </div>
  );
}
