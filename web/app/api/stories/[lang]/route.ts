// Every published match story, for the upset cards (components/upsets/UpsetStory.tsx), which load it in the browser:
// in the pages themselves, publishing a story would have every upsets page built again (hundreds), as any of them may
// show the match. One file per language (/api/stories/nb, /api/stories/en), built from cached data (the stories'
// tag, data/sanity.ts), so the responses are prerendered and refreshed when a story is published.
// → MatchStory[] (types), newest first.
import { getStories } from "@/data/sanity";
import { isLanguage, LANGUAGES } from "@/messages/i18n";
import type { MatchStory } from "@/types";

export const generateStaticParams = async () => LANGUAGES.map((lang) => ({ lang }));

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const stories: MatchStory[] = (await getStories(lang)).map(({ key, title, story, source, teller }) => ({ key, title, story, source, teller }));
  return Response.json(stories);
}
