import Link from "next/link";
import User from "./profile/User";
import ThemeChanger from "./ThemeChanger";

export default function Navbar() {
  return (
    <div className="navbar h-full bg-base-100 shadow-sm">
      <div>
        <Link href="/">لوپ</Link>
      </div>

      <div className="flex flex-1 justify-center gap-2 p-1">
        <Link href="/games/avalon" className="btn btn-ghost btn-sm">
          Avalon
        </Link>
      </div>

      <div className="flex h-full items-center">
        <ThemeChanger />
        <div>
          <User />
        </div>
      </div>
    </div>
  );
}
