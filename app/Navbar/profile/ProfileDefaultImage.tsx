import Image from "next/image";

export default function ProfileDefaultImage() {
  return (
    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
      <div className="w-10 rounded-full">
        <Image
          alt="Profile"
          role="button"
          tabIndex={0}
          width={48}
          height={48}
          className="rounded-full btn btn-outline p-0 border border-info"
          src={"/avatar.png"}
        />
      </div>
    </div>
  );
}
