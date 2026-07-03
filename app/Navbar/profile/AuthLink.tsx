import Link from "next/link";
import ProfileDefaultImage from "./ProfileDefaultImage";

export default function UserAuthLink() {
  return (
    <Link href={"/auth"}>
      <ProfileDefaultImage />
    </Link>
  );
}
