"use client";

import Link from "next/link";
import { useState } from "react";
import type { ApiUser } from "@/types/user";
import ProfileDefaultImage from "./ProfileDefaultImage";

export default function Profile({ user }: { user: ApiUser }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  function closeDrawer() {
    setIsDrawerOpen(false);
  }

  return (
    <div className="drawer">
      <input
        id="my-drawer-1"
        type="checkbox"
        className="drawer-toggle"
        checked={isDrawerOpen}
        onChange={(event) => setIsDrawerOpen(event.target.checked)}
      />
      <div className="drawer-content">
        <label htmlFor="my-drawer-1" className="">
          <ProfileDefaultImage profileImage={user.profileImage || "/avatar.png"} />
        </label>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="my-drawer-1"
          aria-label="بستن منو"
          className="drawer-overlay"
        ></label>
        <ul className="menu bg-base-200 min-h-full w-80 p-4">
          <li className="menu-title">
            <span>{user.name}</span>
          </li>
          <li>
            <Link href="/user" onClick={closeDrawer}>
              داشبورد
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
