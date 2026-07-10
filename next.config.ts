import type { NextConfig } from "next";

// Standalone output is for the Docker image (see Dockerfile, which sets
// BUILD_STANDALONE=1). Vercel builds its own output format and does not want it.
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
