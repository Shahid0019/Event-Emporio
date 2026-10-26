import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** Uploaded images are served from S3 (or a CDN in front of it); allow next/image to optimise them. */
const s3PublicBase =
  process.env.S3_PUBLIC_BASE_URL ||
  (process.env.S3_BUCKET && process.env.AWS_REGION ? `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com` : "");

const nextConfig: NextConfig = {
  // The e2e test server builds into its own folder so it can run next to `npm run dev`.
  ...(process.env.NEXT_DIST_DIR && { distDir: process.env.NEXT_DIST_DIR }),
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: s3PublicBase ? [new URL(`${s3PublicBase.replace(/\/$/, "")}/**`)] : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
