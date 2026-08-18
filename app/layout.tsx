import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "./Navbar/Navbar";
import { UserProvider } from "./providers/UserProvider";
import { getSiteUrl } from "@/lib/site-url";

const themeInitializer = `
  (function () {
    try {
      var lightTheme = "loop-light";
      var darkTheme = "loop-dark";
      var storageKey = "loop-theme";
      var savedTheme = localStorage.getItem(storageKey);
      var theme =
        savedTheme === lightTheme || savedTheme === darkTheme
          ? savedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? darkTheme
            : lightTheme;

      document.documentElement.setAttribute("data-theme", theme);
    } catch (error) {}
  })();
`;
export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "بازی آوالون آنلاین | لوپ",
    template: "%s | لوپ",
  },
  description:
    "بازی آوالون آنلاین به زبان فارسی؛ میز آوالون بسازید، با دوستانتان بازی کنید و نقش‌ها و مراحل بازی را آنلاین مدیریت کنید.",
  applicationName: "لوپ",
  keywords: [
    "آوالون",
    "بازی آوالون",
    "بازی آوالون آنلاین",
    "آوالون آنلاین",
    "بازی گروهی آنلاین",
    "بازی مافیا آوالون",
  ],
  authors: [{ name: "لوپ" }],
  creator: "لوپ",
  publisher: "لوپ",
  category: "games",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/loop-logo.png",
    apple: "/loop-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-theme="loop-light" suppressHydrationWarning>
      <body className="h-dvh overflow-hidden flex flex-col">
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitializer }}
        />
        <UserProvider>
          <header className="relative z-[1000] h-16 shrink-0">
            <Navbar />
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </UserProvider>
      </body>
    </html>
  );
}
