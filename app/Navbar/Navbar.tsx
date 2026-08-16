import Image from "next/image";
import Link from "next/link";
import User from "./profile/User";
import ThemeChanger from "./ThemeChanger";
import ActiveAvalonTableLink from "./ActiveAvalonTable";

export default function Navbar() {
  return (
    <nav
      aria-label="منوی اصلی"
      className="h-full border-b border-base-300/70 bg-base-100/95 shadow-sm backdrop-blur"
    >
      <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:gap-4 sm:px-5 lg:px-8">
        <Link
          href="/"
          aria-label="صفحه اصلی لوپ"
          className="flex size-11 items-center justify-center justify-self-start rounded-xl transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-12"
        >
          <Image
            src="/loop-logo.png"
            alt="لوپ"
            width={48}
            height={48}
            priority
            className="size-full object-contain"
          />
        </Link>

        <div className="flex min-w-0 items-center justify-center gap-1.5 sm:gap-2">
          <Link
            href="/games/avalon"
            className="btn btn-ghost h-10 min-h-10 px-3 text-sm sm:px-4"
          >
            Avalon
          </Link>
          <ActiveAvalonTableLink />
        </div>

        <div className="flex h-11 items-center justify-self-end gap-1 sm:gap-2">
          <ThemeChanger />
          <User />
        </div>
      </div>
    </nav>
  );
}
