import Image from "next/image";
import { getProfileImageSrc } from "@/lib/profile-image";
import type { ApiUser } from "@/types/user";

export default function ProfileDefaultImage({
  profileImage,
}: {
  profileImage: ApiUser["profileImage"];
}) {
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label="حساب کاربری"
      className="avatar btn btn-ghost btn-circle h-11 min-h-11 w-11 p-1"
    >
      <div className="size-9 rounded-full">
        <Image
          alt="تصویر پروفایل"
          width={48}
          height={48}
          loading="eager"
          className="rounded-full object-cover"
          unoptimized
          src={getProfileImageSrc(profileImage)}
        />
      </div>
    </div>
  );
}
