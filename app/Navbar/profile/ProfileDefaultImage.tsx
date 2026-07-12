import Image from "next/image";
import { getProfileImageSrc } from "@/lib/profile-image";
import type { ApiUser } from "@/types/user";

export default function ProfileDefaultImage({
  profileImage,
}: {
  profileImage: ApiUser["profileImage"];
}) {
  return (
    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
      <div className="w-8 rounded-full">
        <Image
          alt="profile image"
          role="button"
          tabIndex={0}
          width={48}
          height={48}
          className="rounded-full btn  p-0"
          unoptimized
          src={getProfileImageSrc(profileImage)}
        />
      </div>
    </div>
  );
}
