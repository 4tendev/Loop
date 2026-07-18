"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useUser } from "@/app/providers/UserProvider";
import type { ApiResponseBody } from "@/lib/api-response";
import type { AvalonRoleName } from "@/types/avalon";
import type { AvalonHistoryItem } from "@/types/avalon-history";

const roleLabels: Record<AvalonRoleName, string> = {
  merlin: "مرلین",
  percival: "پرسیوال",
  servant: "خدمتگزار آرتور",
  assassin: "قاتل",
  morgana: "مورگانا",
  mordred: "موردرد",
  oberon: "اوبرون",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function HistoryCard({ game }: { game: AvalonHistoryItem }) {
  const isCompleted = game.status === "completed";
  const didUserWin =
    isCompleted && game.userSide !== null && game.userSide === game.winnerSide;

  return (
    <article className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold">{game.name}</h2>
              <span
                className={`badge badge-sm ${
                  isCompleted ? "badge-neutral" : "badge-error badge-outline"
                }`}
              >
                {isCompleted ? "تمام‌شده" : "لغوشده"}
              </span>
              {didUserWin ? (
                <span className="badge badge-success badge-sm">برنده شدید</span>
              ) : null}
              {isCompleted && game.userSide && !didUserWin ? (
                <span className="badge badge-ghost badge-sm">بازنده شدید</span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-base-content/60">
              میز {game.playerCount} نفره · ساخته‌شده توسط {game.creatorName} ·{" "}
              {formatDate(game.endedAt ?? game.createdAt)}
            </p>
          </div>

          <Link
            className="btn btn-primary btn-sm"
            href={`/games/avalon/tables/${game.id}`}
          >
            مشاهده میز
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-box bg-base-200 p-3">
            <span className="block text-xs text-base-content/60">نتیجه</span>
            <strong>
              {game.status === "cancelled"
                ? "بدون نتیجه"
                : game.winnerSide === "good"
                  ? "پیروزی خوب‌ها"
                  : "پیروزی شرورها"}
            </strong>
          </div>
          <div className="rounded-box bg-base-200 p-3">
            <span className="block text-xs text-base-content/60">نقش شما</span>
            <strong>
              {game.userRole
                ? roleLabels[game.userRole]
                : game.startedAt
                  ? "سازنده میز"
                  : "بازی شروع نشد"}
            </strong>
          </div>
          <div className="rounded-box bg-success/10 p-3 text-success">
            <span className="block text-xs opacity-70">ماموریت موفق</span>
            <strong>{game.successfulMissions}</strong>
          </div>
          <div className="rounded-box bg-error/10 p-3 text-error">
            <span className="block text-xs opacity-70">ماموریت ناموفق</span>
            <strong>{game.failedMissions}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AvalonTableHistoryPage() {
  const { isCheckingUser, user } = useUser();
  const [history, setHistory] = useState<AvalonHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckingUser) {
      return;
    }

    if (!user) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/games/avalon/history", {
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResponseBody<
          AvalonHistoryItem[] | null
        >;

        if (!response.ok || !result.data) {
          throw new Error(result.message);
        }

        if (isActive) {
          setHistory(result.data);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "دریافت تاریخچه انجام نشد",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [isCheckingUser, user]);

  return (
    <main className="min-h-full bg-base-200 px-4 py-8" dir="rtl">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">تاریخچه میزهای آوالون</h1>
            <p className="mt-1 text-sm text-base-content/60">
              بازی‌های تمام‌شده یا لغوشده‌ای که در آن‌ها حضور داشته‌اید.
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/user">
            بازگشت به داشبورد
          </Link>
        </header>

        {isCheckingUser || isLoading ? (
          <div className="flex min-h-52 items-center justify-center rounded-box bg-base-100">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : null}

        {!isCheckingUser && !user ? (
          <div className="alert">
            <span>برای مشاهده تاریخچه وارد حساب خود شوید.</span>
            <Link className="btn btn-primary btn-sm" href="/auth">
              ورود
            </Link>
          </div>
        ) : null}

        {error ? <div className="alert alert-error">{error}</div> : null}

        {!isLoading && user && !error && history.length === 0 ? (
          <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-10 text-center">
            <p className="font-semibold">هنوز میز ثبت‌شده‌ای ندارید.</p>
            <p className="mt-1 text-sm text-base-content/60">
              بازی‌های تمام‌شده و لغوشده اینجا نمایش داده می‌شوند.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && history.length > 0 ? (
          <div className="grid gap-4">
            {history.map((game) => (
              <HistoryCard game={game} key={game.id} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
