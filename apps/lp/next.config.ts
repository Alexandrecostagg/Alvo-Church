import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "export",
  images: {
    unoptimized: true,
  },
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
