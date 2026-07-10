const BUNNY_CDN_HOST_SUFFIX = ".b-cdn.net";
const BUNNY_PROFILE_IMAGE_PATH_PREFIX = "/profile-images/";
const PROFILE_IMAGE_PROXY_PATH = "/api/profile-image";

export function getProfileImageSrc(profileImage?: string | null) {
  const fallbackImage = "/avatar.png";
  const image = profileImage?.trim();

  if (!image) {
    return fallbackImage;
  }

  if (image.startsWith("/")) {
    return image;
  }

  try {
    const url = new URL(image);
    const isBunnyProfileImage =
      url.protocol === "https:" &&
      url.hostname.endsWith(BUNNY_CDN_HOST_SUFFIX) &&
      url.pathname.startsWith(BUNNY_PROFILE_IMAGE_PATH_PREFIX);

    if (!isBunnyProfileImage) {
      return image;
    }

    const params = new URLSearchParams({ url: url.toString() });

    return `${PROFILE_IMAGE_PROXY_PATH}?${params.toString()}`;
  } catch {
    return fallbackImage;
  }
}

export function isAllowedBunnyProfileImageUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(BUNNY_CDN_HOST_SUFFIX) &&
      url.pathname.startsWith(BUNNY_PROFILE_IMAGE_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}
