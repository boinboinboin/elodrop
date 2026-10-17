// robots.txt. AI training crawlers are kept out entirely: they fetched every player page over and
// over, and each page view runs a Vercel Function (the free plan's limits). Search engines are
// welcome, except on head to head (a page for every pair of players), the API and the Studio.
import type { MetadataRoute } from "next";

const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "PerplexityBot",
  "cohere-ai",
  "Diffbot",
  "omgili",
  "Timpibot",
  "ImagesiftBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/head-to-head", "/api/", "/studio"] },
    ],
  };
}
