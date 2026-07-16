import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes internos do monorepo são consumidos como fonte TS.
  transpilePackages: [
    "@tokenlens/chain",
    "@tokenlens/registry",
    "@tokenlens/shared",
  ],
};

export default nextConfig;
