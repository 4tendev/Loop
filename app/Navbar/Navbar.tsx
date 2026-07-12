import Link from "next/link";
import User from "./profile/User";
import ThemeChanger from "./ThemeChanger";

export default function Navbar() {
  return (
    <div className=" flex bg-base-100 shadow-sm h-10 p-1 justify-center items-center">
      <div className="">
        <Link href="/">لوپ</Link>
      </div>

      <div className="flex flex-1 justify-center gap-2 p-1 h-8">
        <Link href="/games/avalon" className="btn h-full btn-ghost btn-sm">
          Avalon
        </Link>
      </div>

      <div className="flex items-center h-8 gap-2 justify-center items-cent">
        <ThemeChanger />
        <div>
          <User />
        </div>
      </div>
    </div>
  );
}
