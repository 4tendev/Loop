import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getSiteUrl } from "@/lib/site-url";
import HomeFeaturedTable from "./HomeFeaturedTable";

export const metadata: Metadata = {
  title: "بازی آوالون آنلاین فارسی",
  description:
    "بازی آوالون آنلاین به زبان فارسی با میزهای ۷ تا ۱۰ نفره، گفت‌وگوی صوتی و مدیریت خودکار نقش‌ها و مراحل بازی.",
  alternates: { canonical: "/" },
};

const features = [
  {
    title: "مدیریت خودکار بازی",
    description: "تقسیم نقش‌ها، رأی‌گیری تیم، مأموریت‌ها و نتیجه هر مرحله داخل میز انجام می‌شود.",
    icon: "♟",
  },
  {
    title: "گفت‌وگوی صوتی",
    description: "برای بحث، دفاع و پیدا کردن یاران شر از گفت‌وگوی صوتی همان میز استفاده کنید.",
    icon: "◉",
  },
  {
    title: "میزهای ۷ تا ۱۰ نفره",
    description: "تعداد بازیکنان را انتخاب کنید و ترکیب نقش‌ها و قانون مأموریت‌ها را پیش از شروع ببینید.",
    icon: "♜",
  },
];

const roles = [
  { name: "مرلین", side: "یاران خیر", image: "/avalon/avalon_characters/Merlin.png" },
  { name: "پرسیوال", side: "یاران خیر", image: "/avalon/avalon_characters/Percival.png" },
  { name: "مورگانا", side: "یاران شر", image: "/avalon/avalon_characters/Morgana.png" },
  { name: "آدمکش", side: "یاران شر", image: "/avalon/avalon_characters/Assassin.png" },
];

const faqs = [
  {
    question: "بازی آوالون آنلاین چیست؟",
    answer: "آوالون یک بازی گروهیِ نقش مخفی است. بازیکنان در دو گروه خیر و شر برای موفقیت یا شکست مأموریت‌ها رقابت می‌کنند و هویت نقش‌ها تا پایان بازی پنهان می‌ماند.",
  },
  {
    question: "چند نفر می‌توانند در لوپ آوالون بازی کنند؟",
    answer: "در حال حاضر میزهای آوالون لوپ برای ۷، ۸، ۹ یا ۱۰ بازیکن ساخته می‌شوند.",
  },
  {
    question: "برای ساخت بازی آوالون چه کاری لازم است؟",
    answer: "پس از ورود به حساب، تعداد بازیکنان و تنظیمات میز را انتخاب و بازی را ایجاد کنید. سپس دوستانتان می‌توانند وارد میز شوند و روی صندلی‌های خالی بنشینند.",
  },
  {
    question: "آیا آوالون آنلاین لوپ گفت‌وگوی صوتی دارد؟",
    answer: "بله؛ سازنده میز می‌تواند هنگام ساخت بازی، گزینه گفت‌وگوی صوتی را فعال یا غیرفعال کند.",
  },
];

export default function AvalonPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "بازی آوالون آنلاین لوپ",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        inLanguage: "fa-IR",
        description: "نسخه آنلاین فارسی بازی گروهی آوالون برای ۷ تا ۱۰ بازیکن.",
        url: getSiteUrl().toString(),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-full bg-base-200 text-base-content" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklab,var(--color-base-content)_10%,transparent),_transparent_32%),radial-gradient(circle_at_bottom_left,_color-mix(in_oklab,var(--color-base-content)_7%,transparent),_transparent_28%),linear-gradient(135deg,_var(--color-base-200),_var(--color-base-300))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(color-mix(in_oklab,var(--color-base-content)_10%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--color-base-content)_10%,transparent)_1px,transparent_1px)] [background-size:36px_36px]" />

        <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)] lg:px-8">
          <div className="space-y-7 text-base-content">
            <span className="badge badge-outline border-base-content/25 bg-base-100/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.3em] text-base-content">
              Avalon Online
            </span>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-black leading-tight text-base-content sm:text-5xl lg:text-6xl">
                بازی آوالون آنلاین؛ رقابت خیر و شر با دوستان
              </h1>
              <p className="max-w-2xl text-base leading-8 text-base-content/75 sm:text-lg">
                میز آوالون فارسی خودتان را برای ۷ تا ۱۰ نفر بسازید؛ نقش‌ها را مخفیانه دریافت کنید،
                درباره مأموریت‌ها گفت‌وگو کنید و تمام مراحل بازی را آنلاین پیش ببرید.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="btn btn-primary btn-lg rounded-full px-7 shadow-lg shadow-primary/30"
                href="/games/avalon/create"
              >
                شروع بازی آوالون
              </Link>
              <Link
                className="btn btn-outline btn-lg rounded-full border-base-content/30 bg-base-100/35 px-7 text-base-content hover:border-base-content hover:bg-base-content hover:text-base-100"
                href="/games/avalon/tables"
              >
                مشاهده میزهای فعال
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-base-content/65" aria-label="امکانات اصلی">
              <li>✓ رابط کاملاً فارسی</li>
              <li>✓ نقش‌های اصلی آوالون</li>
              <li>✓ گفت‌وگوی صوتی اختیاری</li>
            </ul>
          </div>

          <div className="relative min-h-96">
            <div className="absolute inset-8 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
            <HomeFeaturedTable />
          </div>
        </div>
      </section>

      <section className="border-y border-base-300 bg-base-100 px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="online-features">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold text-primary">آوالون آنلاین در لوپ</p>
            <h2 id="online-features" className="mt-2 text-3xl font-black sm:text-4xl">همه‌چیز برای یک بازی روان و هیجان‌انگیز</h2>
            <p className="mt-4 leading-8 text-base-content/70">به‌جای پخش کارت و ثبت دستی رأی‌ها، روی بلوف‌زدن، تحلیل رفتار بازیکنان و پیدا کردن مرلین تمرکز کنید.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="loop-subtle-panel rounded-box border border-base-300 bg-base-200/60 p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-xl text-primary">{feature.icon}</span>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 leading-7 text-base-content/65">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="what-is-avalon">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold text-primary">راهنمای کوتاه بازی</p>
            <h2 id="what-is-avalon" className="mt-2 text-3xl font-black sm:text-4xl">بازی آوالون چیست و چگونه انجام می‌شود؟</h2>
            <p className="mt-5 leading-8 text-base-content/70">آوالون یک بازی استنتاج اجتماعی و نقش مخفی است. یاران آرتور تلاش می‌کنند سه مأموریت را با موفقیت به پایان برسانند؛ در مقابل، نیروهای شر با پنهان‌کردن هویت خود و نفوذ در تیم مأموریت، برای شکست آن‌ها تلاش می‌کنند.</p>
            <ol className="mt-6 space-y-4">
              {[
                ["تشکیل تیم", "پادشاه بازیکنان مأموریت را پیشنهاد می‌کند و همه به ترکیب تیم رأی می‌دهند."],
                ["انجام مأموریت", "اعضای تیم رأی مخفی موفقیت یا شکست می‌دهند و نتیجه بدون افشای رأی افراد اعلام می‌شود."],
                ["تعیین برنده", "سه مأموریت موفق، خیر را به پیروزی نزدیک می‌کند؛ اما آدمکش هنوز فرصت شناسایی مرلین را دارد."],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-content">{index + 1}</span>
                  <div><h3 className="font-bold">{title}</h3><p className="mt-1 leading-7 text-base-content/65">{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <article key={role.name} className="overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
                <div className="relative aspect-[4/3] bg-base-300/60">
                  <Image src={role.image} alt={`کارت نقش ${role.name} در بازی آوالون`} fill sizes="(max-width: 1024px) 50vw, 260px" className="object-contain p-2" />
                </div>
                <div className="p-3"><h3 className="font-bold">{role.name}</h3><p className="text-xs text-base-content/55">{role.side}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-base-100 px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="avalon-faq">
        <div className="mx-auto max-w-3xl">
          <h2 id="avalon-faq" className="text-center text-3xl font-black sm:text-4xl">سؤال‌های رایج درباره آوالون آنلاین</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-box border border-base-300 bg-base-200 p-5">
                <summary className="cursor-pointer list-none font-bold marker:content-none">{faq.question}</summary>
                <p className="mt-3 leading-8 text-base-content/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-neutral px-6 py-12 text-center text-neutral-content shadow-xl sm:px-12">
          <h2 className="text-3xl font-black">برای ورود به قلمرو آوالون آماده‌اید؟</h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-neutral-content/75">دوستانتان را جمع کنید، تنظیمات بازی را انتخاب کنید و نخستین میز آوالون آنلاین خود را بسازید.</p>
          <Link className="btn btn-primary btn-lg mt-7 rounded-full px-8" href="/games/avalon/create">ساخت میز آوالون</Link>
        </div>
      </section>
    </main>
  );
}
