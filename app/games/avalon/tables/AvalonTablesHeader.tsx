import Link from "next/link";

import { connectionLabels } from "./avalonTableUtils";
import type { ConnectionStatus } from "./types";

type AvalonTablesHeaderProps = {
  tableId?: string;
  connectionStatus: ConnectionStatus;
  canCreateGame: boolean;
};

export function AvalonTablesHeader({
  tableId,
  connectionStatus,
  canCreateGame,
}: AvalonTablesHeaderProps) {
  return (
    <div className="border-b border-base-300 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase text-base-content/50">
            Avalon
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {tableId ? "میز آوالون" : "بازی‌های فعال آوالون"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/65">
            {tableId
              ? "این صفحه فقط همین میز را از سرور وب‌سوکت دنبال می‌کند."
              : "این فهرست برای کاربران ناشناس فقط خواندنی است و از سرور وب‌سوکت به‌روزرسانی می‌شود."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`badge ${
              connectionStatus === "connected"
                ? "badge-success"
                : connectionStatus === "connecting"
                  ? "badge-warning"
                  : "badge-error"
            }`}
          >
            {connectionLabels[connectionStatus]}
          </span>
          <>
            {tableId ? (
              <Link
                className="btn btn-outline btn-sm"
                href="/games/avalon/tables"
              >
                همه میزها
              </Link>
            ) : canCreateGame ? (
              <Link
                className="btn btn-primary btn-sm"
                href="/games/avalon/create"
              >
                ساخت بازی
              </Link>
            ) : null}
          </>
        </div>
      </div>
    </div>
  );
}
