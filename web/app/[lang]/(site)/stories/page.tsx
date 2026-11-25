// Story Time: every published match story (sanity/schemas/matchStory.ts), newest first, each with its match (the day,
// the event, who beat whom and the score, from the first player's matches) and a link to head to head; and, where the
// site has accounts, the form to send one in (components/stories/StoryForm.tsx, loaded in the browser, so the page
// stays the same for everyone). Built again when a story is published (the stories' tag, data/sanity.ts) and when one
// of the first players' match files changes (data/load.ts): two pages, one per language.
import type { Metadata } from "next";
import { ArrowRight } from "@/components/SVG";
import PlayerName from "@/components/players/PlayerName";
import StoryBody from "@/components/stories/StoryBody";
import StoryForm from "@/components/stories/StoryForm";
import Link from "@/components/ui/Link";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { getPlayer, getPlayerMatches } from "@/data/players";
import { getStories } from "@/data/sanity";
import { getI18n } from "@/messages/server";
import type { Match, MatchStory, Pool } from "@/types";
import { ACCOUNTS } from "@/utils/account";
import { doublesHeadToHeadHref, headToHeadHref } from "@/utils/hrefs";
import { parseMatchKey } from "@/utils/matchKey";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("stories.metadata.title"), description: t("stories.metadata.description"), path: "/stories" });
}

type Side = { id: number | null; name: string }[];
/** A story's match as its first player played it: winners first (the first player's side on a draw), with the score from theirs */
interface StoryMatch {
  day: string;
  event: string;
  pool: Pool;
  winners: Side;
  losers: Side;
  draw: boolean;
  score: string;
}

/** The score as the other side saw it ("21-15, 19-21" → "15-21, 21-19") */
const flipped = (score: string) => score.replace(/(\d+)-(\d+)/g, "$2-$1");

/** A story's match, from its first player's matches (null: not found, such as a key mistyped in the Studio) */
async function findMatch(key: string, players: number[]): Promise<StoryMatch | null> {
  const player = players[0] !== undefined ? await getPlayer(players[0]) : null;
  if (!player) return null;
  for (const [pool, matches] of Object.entries(await getPlayerMatches(player)) as [Pool, Match[]][]) {
    const m = matches.find((match) => match.key && parseMatchKey(match.key)?.key === key);
    if (!m) continue;
    const own: Side = [{ id: player.id, name: player.name }, ...(m.partner ? [{ id: m.partner.id ?? null, name: m.partner.name }] : [])];
    const other: Side = m.opponents.map((o) => ({ id: o.id ?? null, name: o.name }));
    const lost = m.result === 0;
    return { day: m.day, event: m.event, pool, winners: lost ? other : own, losers: lost ? own : other, draw: m.result !== 0 && m.result !== 1, score: lost ? flipped(m.score) : m.score };
  }
  return null;
}

export default async function StoriesPage() {
  const { t, plural, lang } = await getI18n();
  const stories = await getStories(lang);
  const matches = await Promise.all(stories.map((s) => findMatch(s.key, s.players)));
  return (
    <>
      <Section>
        <h1 className="h1">{t("stories.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("stories.intro")}</p>
        {ACCOUNTS && (
          <p className="mt-4">
            <a href="#tell" className={TEXT_LINK}>{t("stories.form.title")} <ArrowRight /></a>
          </p>
        )}
      </Section>
      <Section>
        {stories.length ? (
          <>
            <p className="text-sm text-gray-600 mb-4">{plural("stories.count", stories.length)}</p>
            <ol className="grid grid-cols-1 gap-6 max-w-3xl">
              {stories.map((story, i) => (
                <li key={story.id}>
                  <StoryCard story={story} match={matches[i]} />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-gray-600">{t("stories.none")}</p>
        )}
      </Section>
      {ACCOUNTS && (
        <Section>
          <h2 id="tell" className="text-3xl mb-2 scroll-mt-(--header-offset)">{t("stories.form.title")}</h2>
          <p className="text-gray-700 max-w-3xl mb-6">{t("stories.form.intro")}</p>
          <StoryForm />
        </Section>
      )}
    </>
  );
}

async function StoryCard({ story, match }: { story: MatchStory & { players: number[] }; match: StoryMatch | null }) {
  const { t, date } = await getI18n();
  const names = (side: Side, strong = false) =>
    side.map((p, i) => (
      <span key={p.id ?? p.name}>
        {i > 0 && " / "}
        <PlayerName id={p.id} name={p.name} pool={match?.pool} className={strong ? "font-semibold" : ""} linkClassName="link hover:text-blue-600" />
      </span>
    ));
  const ids = (side: Side) => side.map((p) => p.id).filter((id): id is number => id !== null);
  // Head to head when every player has a page: singles or two pairs
  const h2h =
    match && [...match.winners, ...match.losers].every((p) => p.id !== null)
      ? match.winners.length === 1 && match.losers.length === 1
        ? headToHeadHref(match.winners[0].id!, match.losers[0].id!, match.pool)
        : match.winners.length === 2 && match.losers.length === 2
          ? doublesHeadToHeadHref(ids(match.winners), ids(match.losers), match.pool)
          : null
      : null;
  return (
    <article className="bg-white p-4 md:p-6">
      {story.title && <h2 className="text-2xl mb-2 wrap-anywhere">{story.title}</h2>}
      {match ? (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {date(match.day)} · {match.event}
          </p>
          <p className="wrap-anywhere">
            {names(match.winners, true)} {t(match.draw ? "stories.drew" : "stories.beat")} {names(match.losers)}{" "}
            <span className="text-gray-600 tabular-nums whitespace-nowrap">{match.score}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4 font-mono">{story.key}</p>
      )}
      <StoryBody story={story} title={false} boxed />
      {h2h && (
        <p className="mt-4 text-sm">
          <Link href={h2h} className={TEXT_LINK}>{t("stories.headToHead")}</Link>
        </p>
      )}
    </article>
  );
}
