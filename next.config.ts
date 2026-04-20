import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["http://192.168.78.216", "http://localhost:3000"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
