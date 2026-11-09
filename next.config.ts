import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/accounts/**": ["./node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"] },
  /* config options here */
};

export default nextConfig;
