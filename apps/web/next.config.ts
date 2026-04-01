import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for @opennextjs/cloudflare
  // Images are handled via Cloudflare Images or unoptimized for now
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
