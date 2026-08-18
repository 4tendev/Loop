
import type { Metadata } from "next";
import AvalonPage from "./games/avalon/page";

export const metadata: Metadata = {
  title: "بازی آوالون آنلاین فارسی",
  description:
    "آوالون آنلاین را با دوستانتان بازی کنید؛ ساخت میز برای ۷ تا ۱۰ بازیکن، گفت‌وگوی صوتی، نقش‌های کامل و مدیریت خودکار مراحل بازی.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "/",
    siteName: "لوپ",
    title: "بازی آوالون آنلاین فارسی | لوپ",
    description:
      "میز آوالون آنلاین بسازید و با دوستانتان در یک بازی گروهی فارسی رقابت کنید.",
    images: [
      {
        url: "/loop-logo.png",
        width: 512,
        height: 512,
        alt: "لوپ؛ بازی آوالون آنلاین",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "بازی آوالون آنلاین فارسی | لوپ",
    description: "ساخت میز و تجربه بازی آوالون آنلاین با دوستان در لوپ.",
    images: ["/loop-logo.png"],
  },
};

export default function Home() {
  return <AvalonPage />;
}
