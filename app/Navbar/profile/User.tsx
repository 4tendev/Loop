"use client";

import { useUser } from "@/app/providers/UserProvider";
import UserAuthLink from "./AuthLink";
import Profile from "./Profile";

export default function User() {
  const { isCheckingUser, user } = useUser();

  if (isCheckingUser) {
    return (
      <div className="btn btn-ghost btn-circle">
        <span className="loading loading-spinner loading-md text-info" />
      </div>
    );
  }

  return user ? <Profile user={user} /> : <UserAuthLink />;
}
