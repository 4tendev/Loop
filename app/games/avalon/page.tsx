import Link from "next/link";


export default function AvalonPage() {
  return (
    <main className="min-h-full bg-base-200 text-base-content" dir="rtl">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklab,var(--color-base-content)_10%,transparent),_transparent_32%),radial-gradient(circle_at_bottom_left,_color-mix(in_oklab,var(--color-base-content)_7%,transparent),_transparent_28%),linear-gradient(135deg,_var(--color-base-200),_var(--color-base-300))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(color-mix(in_oklab,var(--color-base-content)_10%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-base-content)_10%,transparent)_1px,transparent_1px)] [background-size:36px_36px]" />

        <div className="relative mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="w-full max-w-3xl space-y-6 text-base-content">
            <span className="badge badge-outline border-base-content/25 bg-base-100/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.3em] text-base-content">
              Avalon
            </span>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-black leading-tight text-base-content sm:text-5xl lg:text-6xl">
                میزهای آوالون را بسازید و بازی‌های فعال را زنده ببینید
              </h1>
              <p className="max-w-2xl text-base leading-8 text-base-content/75 sm:text-lg">
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
                className="btn btn-outline btn-lg rounded-full border-base-content/30 bg-base-100/35 px-7 text-base-content hover:border-base-content hover:bg-base-content hover:text-base-100"
                href="/games/avalon/tables"
              >
                دیدن میزها
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
