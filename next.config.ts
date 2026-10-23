import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Default is 1 MB — Studio PNG frames (AR overlay) are usually larger.
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
    /**
     * Next 16 defaults this to true. Turbopack then writes an unbounded
     * `.next/dev/cache/turbopack` (seen at 38+ GB here). Exitmania on Next 15
     * never had this. No size/age prune yet — keep it off until Next adds one.
     * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache
     */
    turbopackFileSystemCacheForDev: false,
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/app", permanent: false },
      { source: "/admin/:path*", destination: "/app/:path*", permanent: false },
      { source: "/overview", destination: "/app", permanent: false },
      { source: "/overview/:path*", destination: "/app/:path*", permanent: false },
      { source: "/account", destination: "/app", permanent: false },
      { source: "/account/:path*", destination: "/app/:path*", permanent: false },
      { source: "/exitmania", destination: "/app", permanent: false },
      { source: "/exitmania/:path*", destination: "/app/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
