import Link from "next/link";

import { playerCounts } from "@/types/avalon";

export default function AvalonPage() {
  return (
    <main className="min-h-full bg-base-200 text-base-content" dir="rtl">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.16),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.12),_transparent_28%),linear-gradient(135deg,_rgba(2,6,23,1),_rgba(15,23,42,0.96))]" />
        <div className="absolute inset-0 opacity-12 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:36px_36px]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full max-w-3xl space-y-6 text-slate-100">
            <span className="badge badge-outline border-white/25 bg-white/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.3em] text-slate-100">
              Avalon
            </span>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                میزهای آوالون را بسازید و بازی‌های فعال را زنده ببینید
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                در صفحه میزها می‌توانید بازی‌های فعال را از طریق وب‌سوکت ببینید،
                روی صندلی بنشینید، صندلی خود را ترک کنید، یا اگر سازنده هستید
                بازی داخل لابی را لغو کنید.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="btn btn-primary btn-lg rounded-full px-7 shadow-lg shadow-primary/30"
                href="/games/avalon/create"
              >
                ساخت بازی جدید
              </Link>
              <Link
                className="btn btn-outline btn-lg rounded-full border-white/40 bg-white/10 px-7 text-white hover:border-white hover:bg-white hover:text-slate-950"
                href="/games/avalon/tables"
              >
                دیدن میزها
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                <p className="text-sm text-slate-300">بازیکن‌ها</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {playerCounts[0]} تا {playerCounts.at(-1)}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                <p className="text-sm text-slate-300">وضعیت میزها</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  زنده
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                <p className="text-sm text-slate-300">ورود به میز</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  با صندلی
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
