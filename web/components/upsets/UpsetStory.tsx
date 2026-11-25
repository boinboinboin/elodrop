"use client";

// The story behind an upset (sanity/schemas/matchStory.ts), under its card, opened from "There's a story here". The
// stories are loaded in the browser (app/api/stories, once per visit, shared by the cards), not built into the upsets
// pages: publishing a story would otherwise have every upsets page built again.
import { useEffect, useState } from "react";
import StoryBody from "@/components/stories/StoryBody";
import Disclosure from "@/components/ui/Disclosure";
import { useI18n } from "@/messages/client";
import type { MatchStory } from "@/types";
import { parseMatchKey } from "@/utils/matchKey";

const loaded = new Map<string, Promise<Map<string, MatchStory>>>();
function loadStories(lang: string) {
  let stories = loaded.get(lang);
  if (!stories) {
    stories = fetch(`/api/stories/${lang}`)
      .then((res) => (res.ok ? (res.json() as Promise<MatchStory[]>) : []))
      .then((list) => new Map(list.map((s) => [s.key, s])));
    // A failed request can be tried again on the next page
    stories.catch(() => loaded.delete(lang));
    loaded.set(lang, stories);
  }
  return stories;
}

export default function UpsetStory({ matchKey }: { matchKey: string }) {
  const { lang, t } = useI18n();
  const [story, setStory] = useState<MatchStory | null>(null);
  useEffect(() => {
    const key = parseMatchKey(matchKey)?.key;
    if (!key) return;
    let live = true;
    loadStories(lang)
      .then((stories) => live && setStory(stories.get(key) ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [matchKey, lang]);
  if (!story) return null;
  return (
    <Disclosure summary={t("stories.open")} className="mt-3 text-sm">
      <StoryBody story={story} boxed more className="mt-2 text-base" />
    </Disclosure>
  );
}
