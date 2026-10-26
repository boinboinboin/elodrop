import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The rankings used to be one page with query parameters (/?pool=women&inactive=1); each list
  // is now its own static page (utils/rankings.ts), men's singles at /rankings. Most specific first. (Old tournament event links,
  // ?event= and ?class=&pool=, open the tournament's first event.)
  async redirects() {
    const query = (key: string, value?: string) => ({ type: "query" as const, key, ...(value ? { value } : {}) });
    const pool = query("pool", "(?<pool>men|women|mensDoubles|womensDoubles|mixedDoubles)");
    return [
      { source: "/", has: [query("pool", "mixedDoubles"), query("gender", "K"), query("inactive", "1")], destination: "/rankings/mixedDoubles-women/inactive", permanent: true },
      { source: "/", has: [query("pool", "mixedDoubles"), query("gender", "K")], destination: "/rankings/mixedDoubles-women", permanent: true },
      { source: "/", has: [pool, query("inactive", "1")], destination: "/rankings/:pool/inactive", permanent: true },
      { source: "/", has: [pool], destination: "/rankings/:pool", permanent: true },
      { source: "/", has: [query("inactive", "1")], destination: "/rankings/men/inactive", permanent: true },
      // Men's singles was the front page until the landing page; its list is /rankings
      { source: "/ranking", destination: "/rankings", permanent: true },
      { source: "/rankings/men", destination: "/rankings", permanent: true },
      // Likewise the strongest clubs (/clubs?pool=women), the upsets (?week=, ?year=) and a tournament's summary
      { source: "/clubs", has: [pool], destination: "/clubs/strongest/:pool", permanent: true },
      { source: "/upsets", has: [query("week", "(?<week>\\d{4}-\\d{2}-\\d{2})")], destination: "/upsets/:week", permanent: true },
      { source: "/upsets", has: [query("year", "(?<year>\\d{4})")], destination: "/upsets/:year", permanent: true },
      { source: "/tournaments/:id", has: [query("view", "summary")], destination: "/tournaments/:id/summary", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      // The changelog, read as text by the "What's new" page (utils/changelog.ts)
      "CHANGELOG.md": { type: "text" },
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
