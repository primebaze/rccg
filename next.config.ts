import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
