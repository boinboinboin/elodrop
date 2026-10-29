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
    const redirects = [
      { source: "/", has: [query("pool", "mixedDoubles"), query("gender", "K"), query("inactive", "1")], destination: "/rankings/mixedDoubles-women/inactive", permanent: true },
      { source: "/", has: [query("pool", "mixedDoubles"), query("gender", "K")], destination: "/rankings/mixedDoubles-women", permanent: true },
      { source: "/", has: [pool, query("inactive", "1")], destination: "/rankings/:pool/inactive", permanent: true },
      { source: "/", has: [pool], destination: "/rankings/:pool", permanent: true },
      { source: "/", has: [query("inactive", "1")], destination: "/rankings/men/inactive", permanent: true },
      // Men's singles was the front page until the landing page; its list is /rankings
      { source: "/ranking", destination: "/rankings", permanent: true },
      { source: "/rankings/men", destination: "/rankings", permanent: true },
      { source: "/rankings/junior/men", destination: "/rankings/junior", permanent: true },
      // Likewise the strongest clubs (/clubs?pool=women), the upsets (?week=, ?year=) and a tournament's summary
      { source: "/clubs", has: [pool], destination: "/clubs/strongest/:pool", permanent: true },
      { source: "/upsets", has: [query("week", "(?<week>\\d{4}-\\d{2}-\\d{2})")], destination: "/upsets/:week", permanent: true },
      { source: "/upsets", has: [query("year", "(?<year>\\d{4})")], destination: "/upsets/:year", permanent: true },
      { source: "/tournaments/:id", has: [query("view", "summary")], destination: "/tournaments/:id/summary", permanent: true },
    ];
    // The same in English ("/en/ranking" → "/en/rankings"), and Norwegian's own addresses are
    // without a prefix: "/nb/..." (the pages' internal address, see rewrites) goes to "/..."
    const english = redirects.map((r) => ({ ...r, source: `/en${r.source === "/" ? "" : r.source}`, destination: `/en${r.destination}` }));
    return [...redirects, ...english, { source: "/nb", destination: "/", permanent: true }, { source: "/nb/:path*", destination: "/:path*", permanent: true }];
  },
  // The pages are under app/[lang]: "/en/..." is English, and every other address is Norwegian,
  // served from "/nb/..." (after the files, the API, the Studio and Next.js's own are checked)
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/", destination: "/nb" },
        // The front page's prefetches (what a click on a link to "/" loads): Next.js asks for them as
        // "/index...", which the rule below would send to "/nb/index...", the 404 page's catch-all
        // (app/[lang]/(site)/[...missing]); the Norwegian front page's are "/nb...". "/index" for
        // when the suffix is set aside while the rewrites are matched (and put back after).
        { source: "/index.segments/:path*", destination: "/nb.segments/:path*" },
        { source: "/index.prefetch.rsc", destination: "/nb.prefetch.rsc" },
        { source: "/index", destination: "/nb" },
        { source: "/:path((?!(?:en|nb|api|studio|_next)(?:/|$)).+)", destination: "/nb/:path" },
      ],
      fallback: [],
    };
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
