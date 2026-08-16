import Link from "next/link";
import type { ApiUser } from "@/types/user";
import ProfileDefaultImage from "./ProfileDefaultImage";

export default function Profile({ user }: { user: ApiUser }) {
  return (
    <Link href="/user" aria-label={`داشبورد ${user.name}`} title={user.name}>
      <ProfileDefaultImage profileImage={user.profileImage || "/avatar.png"} />
    </Link>
  );
}
