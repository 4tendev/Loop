import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./Navbar/Navbar";
import { UserProvider } from "./providers/UserProvider";
export const metadata: Metadata = {
  title: "Loop",
  description: "A new Next.js app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="cupcake">
      <body className="h-screen overflow-hidden flex flex-col">
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
