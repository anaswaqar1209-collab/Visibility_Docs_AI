import type { NextConfig } from "next";

const API_TARGET = process.env.DOCS_API_PROXY_TARGET || "http://localhost:5100";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
