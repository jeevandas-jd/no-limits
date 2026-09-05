import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
