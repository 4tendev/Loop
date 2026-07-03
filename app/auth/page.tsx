import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getUserSessionBySsid,
  sessionCookieName,
} from "@/lib/auth/session";
import EmailAuth from "./email/page";

export default async function Auth() {
  const cookieStore = await cookies();
  const ssid = cookieStore.get(sessionCookieName)?.value;
  const session = ssid ? await getUserSessionBySsid(ssid) : null;

  if (session) {
    redirect("/user");
  }

  return <EmailAuth />;
}
