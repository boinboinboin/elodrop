// robots.txt. AI crawlers (training, AI search and assistants fetching for their users) are kept out
// entirely: they fetched every player page over and over, and each page view runs a Vercel Function.
// robots.txt only asks; Vercel's firewall (the AI bots rule) is what turns away those that don't listen. Search engines are
// welcome, except on head to head (a page for every pair of players), the API and the Studio, and
// are pointed to the sitemap (app/sitemap.ts).
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utils/hrefs";

const AI_CRAWLERS = [
  // OpenAI: training, search and fetching for ChatGPT's users
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Claude-Web",
  "anthropic-ai",
  // Google's and Apple's AI training (their search crawlers are separate and welcome)
  "Google-Extended",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  // Meta
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  // Perplexity, Mistral, Cohere, DuckDuckGo's assistant, You.com
  "PerplexityBot",
  "Perplexity-User",
  "MistralAI-User",
  "cohere-ai",
  "cohere-training-data-crawler",
  "DuckAssistBot",
  "YouBot",
  // Datasets and other AI crawlers
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "AI2Bot",
  "Ai2Bot-Dolma",
  "PanguBot",
  "Diffbot",
  "omgili",
  "Timpibot",
  "ImagesiftBot",
  "img2dataset",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: ["/head-to-head", "/en/head-to-head", "/api/", "/studio"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
