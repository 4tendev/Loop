import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "./Navbar/Navbar";
import { UserProvider } from "./providers/UserProvider";

const themeInitializer = `
  (function () {
    try {
      var lightTheme = "cupcake";
      var darkTheme = "synthwave";
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
  title: "لوپ",
  description: "برنامه لوپ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-theme="cupcake" suppressHydrationWarning>
      <body className="h-screen overflow-hidden flex flex-col">
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitializer }}
        />
        <UserProvider>
          <header className="h-18 shrink-0">
            <Navbar />
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </UserProvider>
      </body>
    </html>
  );
}
