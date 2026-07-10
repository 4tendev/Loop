import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "loopstorage.b-cdn.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
