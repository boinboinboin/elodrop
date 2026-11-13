// robots.txt. Only the crawlers named here are let in; every other one ("*") is asked to stay out of the
// whole site. Each crawl reaches thousands of pages, and a page fetched after a refresh is drawn and
// stored in the cache again, so a crawler that's no use to the site costs a sweep of it every time:
// AhrefsBot (an SEO tool) 18,000 requests in a week in November 2026, before it was named anywhere.
// robots.txt only asks; Vercel's firewall (the AI bots rule and the "costly bots" rule) is what turns
// away those that don't listen.
// Search engines are welcome, except on head to head (a page for every pair of players), the API and
// the Studio, and are pointed to the sitemap (app/sitemap.ts). Bing's index also feeds DuckDuckGo's,
// Ecosia's, Qwant's and Yahoo's results. Link preview bots (what fetches a link shared in a chat or a
// post, to show its title and picture) may also open head to head, so a shared comparison gets its
// preview; they only fetch the links people share, never the pages linked from them.
// AI crawlers (training, AI search and assistants fetching for their users) are named too, though "*"
// already keeps them out: some are tokens that the welcome crawlers read (Google-Extended for
// Googlebot, Applebot-Extended for Applebot), and the list records who has been turned away and why.
// Google's image crawler is kept off the link preview pictures (…/preview.png, opengraph-image): about 10,000 a day in
// November 2026, each drawn and stored in the cache, though nobody searches Google Images for them. Its own group
// replaces Googlebot's for it, so it repeats those rules. Link previews and Google's web search don't use it.
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
  // Exa (an AI search engine for AI tools): 81,000 requests in a week in November 2026, a sweep of the
  // sitemap after each refresh, every page it opened an ISR write; and fetching for its users
  "ExaSearchBot",
  "ExaBot",
  "ExaUser",
  // Amazon's crawler for its assistants' answers (Alexa, Rufus): 16,000 requests that week
  "Amzn-SearchBot",
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

// Google's search crawler (and Search Console's live test), Bing's, DuckDuckGo's own and Apple's
// (Siri and Spotlight suggestions)
const SEARCH_ENGINES = ["Googlebot", "Google-InspectionTool", "Bingbot", "DuckDuckBot", "Applebot"];

// By the names they give (iMessage has none: the phone fetches the preview itself)
const PREVIEW_BOTS = [
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "TelegramBot",
  "facebookexternalhit",
  "Facebot",
  "WhatsApp",
  "Pinterestbot",
  "redditbot",
  "SkypeUriPreview",
  "Mastodon",
  "Bluesky",
  "Embedly",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      { userAgent: PREVIEW_BOTS, allow: "/", disallow: ["/api/", "/studio"] },
      { userAgent: "Googlebot-Image", allow: "/", disallow: ["/*preview.png", "/*opengraph-image", "/head-to-head", "/en/head-to-head", "/api/", "/studio"] },
      { userAgent: SEARCH_ENGINES, allow: "/", disallow: ["/head-to-head", "/en/head-to-head", "/api/", "/studio"] },
      { userAgent: "*", disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
