"use client";

import { useEffect, useState } from "react";
import UserAuthLink from "./AuthLink";
import Profile from "./Profile";

type UserStatus = "checking" | "known" | "unknown";

export default function User() {
  const [status, setStatus] = useState<UserStatus>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkUser() {
      try {
        const response = await fetch("/api/user", {
          cache: "no-store",
          signal: controller.signal,
        });

        setStatus(response.ok ? "known" : "unknown");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setStatus("unknown");
      }
    }

    checkUser();

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return (
      <div className="btn btn-ghost btn-circle">
        <span className="loading loading-spinner loading-md text-info" />
      </div>
    );
  }

  return status === "known" ? <Profile /> : <UserAuthLink />;
}
