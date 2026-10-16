import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    localPatterns: [
      { pathname: "/logos/**" },
      { pathname: "/images/dashboard/**" },
      { pathname: "/images/branding/**" },
      { pathname: "/equipe/**" },
    ],
  },
};

export default nextConfig;
