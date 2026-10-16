import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@prisma/client", "prisma"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }, { source: "/", headers: securityHeaders }];
  },
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
