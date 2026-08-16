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
      className="avatar btn btn-ghost btn-circle h-10 min-h-10 w-10 p-1"
    >
      <div className="size-8 rounded-full">
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
