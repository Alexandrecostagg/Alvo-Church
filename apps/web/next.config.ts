import type { NextConfig } from "next";

const appRoot = process.cwd();

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot
  }
};

export default nextConfig;
