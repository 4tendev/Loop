"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/app/providers/UserProvider";
import type { ApiUser } from "@/types/user";
import ProfileDefaultImage from "./ProfileDefaultImage";

export default function Profile({ user }: { user: ApiUser }) {
  const router = useRouter();
  const { setUser } = useUser();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  async function logOut() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/user", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } finally {
      setUser(null);
      closeDrawer();
      setIsLoggingOut(false);
      router.push("/auth");
      router.refresh();
    }
  }

  return (
    <div className={`drawer  h-10 w-10 ${isDrawerOpen ? "z-[1000]" : ""}`}>
      <input
        id="my-drawer-1"
        type="checkbox"
        className="drawer-toggle"
        checked={isDrawerOpen}
        onChange={(event) => setIsDrawerOpen(event.target.checked)}
      />
      <div className="drawer-content">
        <label htmlFor="my-drawer-1" className="">
          <ProfileDefaultImage
            profileImage={user.profileImage || "/avatar.png"}
          />
        </label>
      </div>

      <div className="drawer-side z-[1000]">
        <label
          htmlFor="my-drawer-1"
          aria-label="بستن منو"
          className="drawer-overlay"
        ></label>

        <ul className="menu bg-base-200 min-h-full w-80 p-4">
          <span className="font-bold">{user.name}</span>
          <li>
            <Link href="/user" onClick={closeDrawer}>
              داشبورد
            </Link>
          </li>
          <li>
            <Link href="/user/tables" onClick={closeDrawer}>
              تاریخچه میزهای آوالون
            </Link>
          </li>
          <li>
            <button
              className="text-error"
              disabled={isLoggingOut}
              onClick={logOut}
              type="button"
            >
              {isLoggingOut ? (
                <span className="loading loading-spinner loading-xs" />
              ) : null}
              خروج
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
