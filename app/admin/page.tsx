import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AvalonTablesClient from "@/app/games/avalon/tables/AvalonTablesClient";
import {
  getUserSessionBySsid,
  sessionCookieName,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const ssid = cookieStore.get(sessionCookieName)?.value;
  const session = ssid ? await getUserSessionBySsid(ssid) : null;

  if (!session) {
    redirect("/auth");
  }

  if (session.user.type !== "admin") {
    redirect("/user");
  }

  return <AvalonTablesClient adminMode />;
}
