import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The rankings used to be one page with query parameters (/?pool=women&inactive=1); each list
  // is now its own static page (lib/rankings.ts). Most specific first.
  async redirects() {
    const query = (key: string, value?: string) => ({ type: "query" as const, key, ...(value ? { value } : {}) });
    const pool = query("pool", "(?<pool>men|women|mensDoubles|womensDoubles|mixedDoubles)");
    return [
      { source: "/", has: [query("pool", "mixedDoubles"), query("gender", "K"), query("inactive", "1")], destination: "/rankings/mixedDoubles-women/inactive", permanent: true },
      { source: "/", has: [query("pool", "mixedDoubles"), query("gender", "K")], destination: "/rankings/mixedDoubles-women", permanent: true },
      { source: "/", has: [pool, query("inactive", "1")], destination: "/rankings/:pool/inactive", permanent: true },
      { source: "/", has: [pool], destination: "/rankings/:pool", permanent: true },
      { source: "/", has: [query("inactive", "1")], destination: "/rankings/men/inactive", permanent: true },
    ];
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
