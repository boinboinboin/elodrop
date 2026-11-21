// An event's knockout as a bracket (/tournaments/<id>/<class>/<pool>/bracket; pipeline/upcoming.mjs bracketOf): each
// stage, the main one first. From large screens the full tree: each round a column, each match halfway between the two
// it comes from (bracketLayout, also where the draw has byes), with lines joining them. Below that, round by round in
// tabs (the main stage's round kept in the URL), each round's matches in a list, swiped through sideways. Matches outside the tree (a play-off
// for third) come after. Each match: its sides (the players, or where they come from), their seeds, the sets and the
// winner; before it's played each side's chance from the ratings, and once played an upset mark when the winner had
// under 30%.
import { SplitBar } from "@/components/head-to-head/SplitBar";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import type { I18n } from "@/messages/i18n";
import { getI18n } from "@/messages/server";
import type { BracketMatch, BracketStage, ClubEntry, TournamentEvent } from "@/types";
import { bracketLayout, roundTitle, sideLabel, stageTitle, UPSET_CHANCE } from "@/utils/tournament";
import EntryNames from "./EntryNames";

/** The lines joining the tree's matches */
const LINE = "absolute border-gray-300";

export default async function Bracket({ event, clubs }: { event: TournamentEvent; clubs: Record<string, ClubEntry> }) {
  const i18n = await getI18n();
  const stages = (event.bracket ?? []).filter((s) => s.matches.length);
  return (
    <div className="grid grid-cols-1 gap-10">
      {stages.map((stage, i) => (
        <section key={i}>
          {stages.length > 1 && <h3 className="text-2xl mb-3">{stageTitle(i18n, stage, event)}</h3>}
          <Stage stage={stage} event={event} clubs={clubs} i18n={i18n} index={i} />
        </section>
      ))}
    </div>
  );
}

function Stage({ stage, event, clubs, i18n, index }: { stage: BracketStage; event: TournamentEvent; clubs: Record<string, ClubEntry>; i18n: I18n; index: number }) {
  const { t } = i18n;
  const { top, units, cells, rounds, extra } = bracketLayout(stage);
  const seedOf = new Map(event.seeds.map((entry, i) => [entry, i + 1]));
  const card = (match: BracketMatch) => <MatchCard match={match} stage={stage} event={event} clubs={clubs} seedOf={seedOf} i18n={i18n} />;
  return (
    <>
      {/* Large screens: the tree, scrolling in its own box where it's wider than the page (five rounds and more) */}
      <div className="hidden lg:block overflow-x-auto">
        {/* Columns of one width (a stage of one match, a placing match, as narrow as the rest) */}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${top + 1}, minmax(18rem, 22rem))`, gridTemplateRows: `auto repeat(${units}, 1fr)` }}>
          {/* The rounds' names; none for a single match (a placing match isn't a "final") */}
          {top > 0 && Array.from({ length: top + 1 }, (_, c) => (
            <h4 key={`h${c}`} className="px-4 pb-2 text-sm text-gray-600" style={{ gridColumn: c + 1, gridRow: 1 }}>
              {roundTitle(i18n, top - c, top)}
            </h4>
          ))}
          {cells.map(({ match, round, start, span, fed }) => (
            // min-w-0 (here and on the card): narrower than the names on one line, so they're cut short with …
            <div key={match.no} className="relative min-w-0 flex items-center px-4 py-1.5" style={{ gridColumn: top - round + 1, gridRow: `${start + 2} / span ${span}` }}>
              {/* From the two it comes from: their lines meet halfway (a feeder's middle is a quarter of the way in) */}
              {(fed[0] || fed[1]) && (
                <>
                  <span aria-hidden="true" className={`${LINE} left-0 border-l`} style={{ top: fed[0] ? "25%" : "50%", bottom: fed[1] ? "25%" : "50%" }} />
                  <span aria-hidden="true" className={`${LINE} left-0 top-1/2 w-4 border-t`} />
                </>
              )}
              {/* To the match it leads to */}
              {round > 0 && <span aria-hidden="true" className={`${LINE} right-0 top-1/2 w-4 border-t`} />}
              <div className="w-full min-w-0">{card(match)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Phones and tablets: round by round */}
      <div className="lg:hidden">
        <Tabs
          label={t("tournaments.bracket.rounds")}
          small
          // Swipe sideways from round to round
          swipe
          className="mb-4"
          id={`stage-${index}`}
          // The main stage's round in the URL (?round=2), so a link can open it
          param={index === 0 ? "round" : undefined}
          tabs={rounds.map((list, r) => ({
            id: String(r + 1),
            label: roundTitle(i18n, top - r, top),
            content: (
              <ul className="grid grid-cols-1 gap-3">
                {list.map((match) => (
                  <li key={match.no}>{card(match)}</li>
                ))}
              </ul>
            ),
          }))}
        />
      </div>

      {/* Outside the tree: a play-off for third */}
      {extra.length > 0 && (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extra.map((match) => (
            <li key={match.no}>
              {match.third && <h4 className="text-sm text-gray-600 mb-1">{t("tournaments.bracket.third")}</h4>}
              {card(match)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function MatchCard({
  match,
  stage,
  event,
  clubs,
  seedOf,
  i18n,
}: {
  match: BracketMatch;
  stage: BracketStage;
  event: TournamentEvent;
  clubs: Record<string, ClubEntry>;
  seedOf: Map<number, number>;
  i18n: I18n;
}) {
  const { t, chance } = i18n;
  const played = match.winner > 0;
  const winnerChance = played && match.chance !== null ? (match.winner === 1 ? match.chance : 1 - match.chance) : null;
  const upset = winnerChance !== null && !match.walkover && winnerChance < UPSET_CHANCE;
  // Not played yet, both known: each side's chance
  const chances = !played && match.chance !== null ? [match.chance, 1 - match.chance] : null;
  const names = match.sides.map((side) => sideLabel(i18n, side, event, stage));
  return (
    <div className="bg-white border border-gray-200 text-sm">
      <div className="flex items-center justify-between gap-2 px-3 pt-2 text-xs text-gray-500">
        <span>{t("tournaments.bracket.matchNo", { no: match.no })}</span>
        {upset && (
          <span title={t("tournaments.bracket.upsetTitle", { chance: chance(winnerChance) })}>
            <Badge>{t("tournaments.bracket.upset")}</Badge>
          </span>
        )}
      </div>
      {/* grid-cols-1: a bare grid's column would grow to the names on one line instead of cutting them short */}
      <div className="grid grid-cols-1 gap-1.5 px-3 pt-1 pb-2.5">
        {match.sides.map((side, i) => {
          const won = match.winner === i + 1;
          const entry = side && "entry" in side ? event.entries[side.entry] : null;
          const seed = side && "entry" in side ? seedOf.get(side.entry) : undefined;
          return (
            <div key={i} className={`flex items-start gap-2 ${won ? "font-semibold" : played ? "text-gray-600" : ""}`}>
              <span className="w-4 shrink-0 font-mono text-xs leading-5 text-gray-500 font-normal" title={seed ? t("tournaments.entry.seed", { seed }) : undefined}>
                {seed ?? ""}
              </span>
              <span className="min-w-0 flex-1">{entry ? <EntryNames e={entry} clubs={clubs} pool={event.pool} compact /> : <span className="italic text-gray-500 font-normal">{names[i]}</span>}</span>
              <span className="shrink-0 flex gap-2 tabular-nums">
                {played && match.walkover
                  ? won && <span title={t("tournaments.bracket.walkoverTitle")}>{t("tournaments.bracket.walkover")}</span>
                  : played
                    ? match.sets.map((set, s) => (
                        <span key={s} className="w-5 text-right">
                          {set[i]}
                        </span>
                      ))
                    : chances && <span className="font-normal text-gray-600">{chance(chances[i])}</span>}
              </span>
            </div>
          );
        })}
        {chances && (
          <SplitBar
            chance={chances[0]}
            className="mt-1"
            label={t("tournaments.bracket.chance", { first: names[0], firstChance: chance(chances[0]), secondChance: chance(chances[1]), second: names[1] })}
          />
        )}
      </div>
    </div>
  );
}
