"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ApiUser } from "@/types/user";

type UserContextValue = {
  user: ApiUser | null;
  isCheckingUser: boolean;
  setUser: (user: ApiUser | null) => void;
  refreshUser: () => Promise<ApiUser | null>;
};

type UserResponse = {
  code: number;
  message: string;
  data: ApiUser | null;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsCheckingUser(true);

    try {
      const response = await fetch("/api/user", {
        cache: "no-store",
      });
      const result = (await response.json()) as UserResponse;
      const nextUser = response.ok ? result.data : null;

      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsCheckingUser(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      isCheckingUser,
      setUser,
      refreshUser,
    }),
    [isCheckingUser, refreshUser, user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}
