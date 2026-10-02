import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (data-tiruan preview) run next to the real one without sharing the build folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  /* config options here */
};

export default nextConfig;
