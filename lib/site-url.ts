const fallbackUrl = "http://localhost:3000";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredUrl) {
    return new URL(fallbackUrl);
  }

  const urlWithProtocol = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `${configuredUrl.startsWith("localhost") ? "http" : "https"}://${configuredUrl}`;

  try {
    return new URL(urlWithProtocol);
  } catch {
    return new URL(fallbackUrl);
  }
}
