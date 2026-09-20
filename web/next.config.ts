import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // 200 MB upload plus multipart fields and boundaries.
    serverActions: { bodySizeLimit: "210mb" },
    proxyClientMaxBodySize: "210mb",
  },
};

export default nextConfig;
