import Link from "next/link";
import User from "./profile/User";
import ThemeChanger from "./ThemeChanger";
export default function Navbar() {
  return (
    <div className="navbar h-full bg-base-100 shadow-sm">
      <div className="">
        <Link href="/">Loop</Link>
      </div>
      <div className="flex p-1 gap-2 flex-1 justify-center">
        <div>Avalon</div>
      </div>

      <div className="flex items-center h-full">
        <ThemeChanger />
        <div>
          <User />
        </div>
      </div>
    </div>
  );
}
