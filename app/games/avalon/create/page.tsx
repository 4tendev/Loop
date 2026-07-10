"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import {
  AvalonGameConfig,
  avalonMissionRulesByPlayerCount,
  playerCounts
} from "@/types/avalon";


type AvalonCreateConfig = Omit<AvalonGameConfig, "playerCount"> & {
  playerCount: (typeof playerCounts)[number];
};

type CreateAvalonGameResponse = {
  code: number;
  message: string;
  data: {
    id: string;
  } | null;
};

function getRolePreview(config: AvalonCreateConfig) {
  const canUseOberon = config.playerCount >= 8;
  const evilRoles = [
    "آدمکش",
    "مورگانا",
    "موردرد",
    ...(canUseOberon && config.useOberon ? ["اوبرون"] : []),
  ];
  const sideCounts = {
    evil: evilRoles.length,
    good: config.playerCount - evilRoles.length,
  };
  const servantCount = Math.max(sideCounts.good - 2, 0);

  return {
    good: [
      "مرلین",
      "پرسیوال",
      ...(servantCount > 0 ? [`خدمتگزار x${servantCount}`] : []),
    ],
    evil: evilRoles,
    sideCounts,
  };
}

export default function CreateAvalonPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AvalonCreateConfig>({
    playerCount: playerCounts[0],
    useOberon: false,
    useLadyOfTheLake: false,
    roleExposing: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missionRules = avalonMissionRulesByPlayerCount[config.playerCount];
  const rolePreview = useMemo(() => getRolePreview(config), [config]);
  const canUseOberon = config.playerCount >= 8;

  function updateConfig(nextConfig: Partial<AvalonCreateConfig>) {
    setError(null);
    setConfig((currentConfig) => {
      const nextPlayerCount = nextConfig.playerCount ?? currentConfig.playerCount;
      const nextUseOberon =
        nextPlayerCount >= 8
          ? (nextConfig.useOberon ?? currentConfig.useOberon)
          : false;

      return {
        ...currentConfig,
        ...nextConfig,
        useOberon: nextUseOberon,
      };
    });
  }

  async function createGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/games/avalon", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });
      const result = (await response.json()) as CreateAvalonGameResponse;

      if (!response.ok || !result.data) {
        setError(result.message || "ساخت بازی انجام نشد.");
        return;
      }

      router.push(`/games/avalon/tables/${result.data.id}`);
    } catch {
      setError("ساخت بازی انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main
      className="min-h-full bg-base-200 px-4 py-8 text-base-content sm:px-6 lg:px-8"
      dir="rtl"
    >
      <form
        className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        onSubmit={createGame}
      >
        <section className="space-y-6">
          <div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
            <div className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase text-base-content/50">
                    Avalon
                  </p>
                  <h1 className="mt-1 text-2xl font-bold">ساخت بازی آوالون</h1>
                </div>
              </div>
            </div>

            <div className="border-t border-base-300 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">بازیکن‌ها</h2>
                  <p className="text-sm text-base-content/60">
                    {rolePreview.sideCounts.good} خیر،{" "}
                    {rolePreview.sideCounts.evil} شر
                  </p>
                </div>
                <div dir="ltr" className="join">
                  {playerCounts.map((count) => (
                    <button
                      className={`btn join-item btn-sm ${
                        config.playerCount === count ? "btn-primary" : "btn-ghost"
                      }`}
                      key={count}
                      onClick={() => updateConfig({ playerCount: count })}
                      type="button"
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-base-300 bg-base-200 p-4">
                  <p className="text-sm font-semibold text-success">خیر</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rolePreview.good.map((role) => (
                      <span className="badge badge-success badge-outline" key={role}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-base-300 bg-base-200 p-4">
                  <p className="text-sm font-semibold text-error">شر</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rolePreview.evil.map((role) => (
                      <span className="badge badge-error badge-outline" key={role}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">تنظیمات</h2>

            <div className="mt-4 grid gap-3">
              <label
                className={`flex items-center justify-between gap-4 rounded-lg border border-base-300 bg-base-200 p-4 ${
                  canUseOberon ? "" : "opacity-60"
                }`}
              >
                <span>
                  <span className="block font-medium">اوبرون</span>
                  <span className="text-sm text-base-content/60">
                    فقط برای بازی‌های ۸ نفره به بالا قابل انتخاب است
                  </span>
                </span>
                <input
                  checked={canUseOberon && config.useOberon}
                  className="toggle toggle-primary"
                  disabled={!canUseOberon}
                  onChange={(event) =>
                    updateConfig({ useOberon: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-base-300 bg-base-200 p-4">
                <span>
                  <span className="block font-medium">بانوی دریاچه</span>
                  <span className="text-sm text-base-content/60">
                    فاز بررسی بانوی دریاچه را به بازی اضافه می‌کند
                  </span>
                </span>
                <input
                  checked={config.useLadyOfTheLake}
                  className="toggle toggle-primary"
                  onChange={(event) =>
                    updateConfig({ useLadyOfTheLake: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-base-300 bg-base-200 p-4">
                <span>
                  <span className="block font-medium">شناخت نقش‌های شر</span>
                  <span className="text-sm text-base-content/60">
                    بازیکن‌های شر نقش دقیق همدیگر را ببینند
                  </span>
                </span>
                <input
                  checked={config.roleExposing}
                  className="toggle toggle-primary"
                  onChange={(event) =>
                    updateConfig({ roleExposing: event.target.checked })
                  }
                  type="checkbox"
                />
              </label>
            </div>
          </div>

        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">قانون ماموریت‌ها</h2>
            <div className="mt-4 grid gap-2">
              {missionRules.map((rule, index) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-base-200 px-3 py-2"
                  key={index}
                >
                  <span className="font-medium">ماموریت {index + 1}</span>
                  <span className="text-sm text-base-content/70">
                    {rule.players} نفر، {rule.minimumFailures} رای شکست
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
            <h2 className="text-lg font-semibold">تنظیمات انتخاب‌شده</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-base-content/60">بازیکن‌ها</dt>
                <dd className="font-medium">{config.playerCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-base-content/60">اوبرون</dt>
                <dd className="font-medium">
                  {canUseOberon && config.useOberon ? "فعال" : "غیرفعال"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-base-content/60">بانوی دریاچه</dt>
                <dd className="font-medium">
                  {config.useLadyOfTheLake ? "فعال" : "غیرفعال"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-base-content/60">شناخت نقش‌های شر</dt>
                <dd className="font-medium">
                  {config.roleExposing ? "فعال" : "غیرفعال"}
                </dd>
              </div>
            </dl>

            {error ? <p className="mt-5 text-sm text-error">{error}</p> : null}

            <button
              className="btn btn-primary mt-5 w-full"
              disabled={isCreating}
              type="submit"
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-sm" />
              ) : null}
              ساخت بازی
            </button>
          </section>
        </aside>
      </form>
    </main>
  );
}
