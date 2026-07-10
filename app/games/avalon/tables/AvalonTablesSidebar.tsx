import { playerCounts } from "@/types/avalon";

import { formatTime } from "./avalonTableUtils";
import type { AvalonWsGame } from "./types";

type AvalonTablesSidebarProps = {
  games: AvalonWsGame[];
  wsUrl: string;
  lastUpdatedAt: string | null;
};

export function AvalonTablesSidebar({
  games,
  wsUrl,
  lastUpdatedAt,
}: AvalonTablesSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">وب‌سوکت</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-base-content/50">آدرس اتصال</dt>
            <dd className="mt-1 break-all font-mono text-xs">{wsUrl}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-base-content/50">بازی‌ها</dt>
            <dd className="font-medium">{games.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-base-content/50">بازیکنان</dt>
            <dd className="font-medium">
              {games.reduce((total, game) => total + game.occupiedSeatCount, 0)}
            </dd>
          </div>
          <div>
            <dt className="text-base-content/50">آخرین به‌روزرسانی</dt>
            <dd className="mt-1">
              {lastUpdatedAt ? formatTime(lastUpdatedAt) : "در انتظار"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">تعداد بازیکنان پشتیبانی‌شده</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {playerCounts.map((count) => (
            <span className="badge badge-outline" key={count}>
              {count}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}
