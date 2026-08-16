import Link from "next/link";
import ProfileDefaultImage from "./ProfileDefaultImage";

export default function UserAuthLink() {
  return (
    <Link href="/auth" aria-label="ورود به حساب کاربری">
      <ProfileDefaultImage profileImage="/avatar.png" />
    </Link>
  );
}
