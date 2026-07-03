import Image from "next/image";
import ThemeChanger from "./ThemeChanger";
export default function Navbar() {
  return (
    <div className="navbar h-full bg-base-100 shadow-sm">
      <div className="">
        <a className="text-xl">Loop</a>
      </div>
      <div className="flex p-1 gap-2 flex-1 justify-center">
        <div>Avalon</div>
      </div>

      <div className="flex-none">
        <ThemeChanger />

        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full">
              <Image
                alt="Profile"
                role="button"
                tabIndex={0}
                width={48}
                height={48}
                className="rounded-full btn btn-outline p-0 border border-info"
                src={"/avatar.png"}
              />
            </div>
          </div>
          <ul
            tabIndex={-1}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
          >
            <li>
              <a className="justify-between">
                Profile
                <span className="badge">New</span>
              </a>
            </li>
            <li>
              <a>Settings</a>
            </li>
            <li>
              <a>Logout</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
