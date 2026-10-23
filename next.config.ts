import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Baseline security headers. The Content-Security-Policy is added in M7 (docs/PLAN.md §8).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  cacheLife: {
    // Public pages (docs/PLAN.md §6): refreshed every 5 minutes, and at once when an admin
    // changes content (updateTag). Five minutes also bounds how late a scheduled post appears.
    public: { stale: 300, revalidate: 300, expire: 86_400 },
  },
  experimental: {
    // Enables forbidden() for 403 pages (src/server/session.ts).
    authInterrupts: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Built-in home photos (npm run hero): cache for a day, revalidate in the background for a week.
      { source: "/hero/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
