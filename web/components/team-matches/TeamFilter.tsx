"use client";

// Narrowing a list of team matches to some teams':
// - On a division's page (components/team-matches/Division.tsx), a dropdown of its teams (TeamSelect) and
//   its rounds (TeamTies) share the team picked through the URL (?team=Sandefjord+2, via nuqs), so a link
//   can open it, and the team's rows in the standings and the power ranking are marked (their `data-team`).
//   Reading the URL can't happen when the page is prerendered (as components/ui/Tabs.tsx), so each has its
//   own Suspense boundary: the prerendered HTML shows every team, and the browser then follows the URL. A
//   team that isn't on the page (an older link) shows them all.
// - On a weekend's page (TeamMatches.tsx), a search for a team or club (TieSearch), as the rankings'.
// The team matches are rendered on the server, all of them; the browser hides the others.
import { parseAsString, useQueryState } from "nuqs";
import { Fragment, type ReactNode, Suspense, useMemo, useState } from "react";
import { Search } from "@/components/SVG";
import ClearButton from "@/components/ui/ClearButton";
import LinkSelect from "@/components/ui/LinkSelect";
import { useI18n } from "@/messages/client";

/** The query parameter with the team shown */
const TEAM_PARAM = "team";

/** A team match in a list: its two teams, what a search finds it by (its teams and clubs), and its row */
export interface TieItem {
  id: number;
  teams: string[];
  search?: string;
  node: ReactNode;
}

/** A list's run of team matches under a heading (a division's group, a round's day) */
export interface TieSection {
  key: string;
  heading: ReactNode;
  ties: TieItem[];
}

/** The team in the URL, if it's one of the page's `teams`, and a way to pick another (null: all) */
function useTeam(teams: string[]) {
  const [param, setParam] = useQueryState(TEAM_PARAM, parseAsString.withOptions({ history: "replace", scroll: false }));
  const team = param && teams.includes(param) ? param : null;
  return [team, (name: string | null) => setParam(name || null)] as const;
}

/** The dropdown of the page's teams; `highlight`: mark the team's rows in the standings and power rankings */
export function TeamSelect({ teams, highlight = false, className }: { teams: string[]; highlight?: boolean; className?: string }) {
  return (
    <Suspense fallback={<TeamSelectView teams={teams} team={null} onSelect={() => {}} className={className} />}>
      <UrlTeamSelect teams={teams} highlight={highlight} className={className} />
    </Suspense>
  );
}

function UrlTeamSelect({ teams, highlight, className }: { teams: string[]; highlight: boolean; className?: string }) {
  const [team, setTeam] = useTeam(teams);
  return (
    <>
      <TeamSelectView teams={teams} team={team} onSelect={setTeam} className={className} />
      {/* The team is one of the page's (useTeam), so its name is safe in a selector */}
      {highlight && team && <style>{`tr[data-team=${JSON.stringify(team)}]{background-color:var(--color-gray-100);font-weight:600}`}</style>}
    </>
  );
}

function TeamSelectView({ teams, team, onSelect, className }: { teams: string[]; team: string | null; onSelect: (name: string | null) => void; className?: string }) {
  const { t } = useI18n();
  return (
    <LinkSelect
      label={t("teamMatches.filter.label")}
      current={team ?? ""}
      onSelect={onSelect}
      options={[{ key: "", label: t("teamMatches.filter.all") }, ...teams.map((name) => ({ key: name, label: name }))]}
      className={className}
    />
  );
}

/** The lists of team matches, each section under its heading, narrowed to the team picked; `teams`: the page's */
export function TeamTies({ teams, sections, className }: { teams: string[]; sections: TieSection[]; className?: string }) {
  return (
    <Suspense fallback={<Ties sections={sections} className={className} />}>
      <UrlTeamTies teams={teams} sections={sections} className={className} />
    </Suspense>
  );
}

function UrlTeamTies({ teams, sections, className }: { teams: string[]; sections: TieSection[]; className?: string }) {
  const { t } = useI18n();
  const [team] = useTeam(teams);
  return <Ties sections={sections} match={team ? (tie) => tie.teams.includes(team) : undefined} none={t("teamMatches.filter.none", { team: team ?? "" })} className={className} />;
}

/** A search for a team or club above the lists of team matches (each section under its heading); `summary`: the count shown without one */
export function TieSearch({ sections, summary, className }: { sections: TieSection[]; summary: string; className?: string }) {
  const { num, t } = useI18n();
  const [query, setQuery] = useState("");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  // Every term in its teams or clubs
  const search = useMemo(() => new Map(sections.flatMap((s) => s.ties.map((tie) => [tie.id, (tie.search ?? tie.teams.join(" ")).toLowerCase()]))), [sections]);
  const match = terms.length ? (tie: TieItem) => terms.every((term) => search.get(tie.id)!.includes(term)) : undefined;
  const total = sections.reduce((n, s) => n + s.ties.length, 0);
  const found = match ? sections.reduce((n, s) => n + s.ties.filter(match).length, 0) : total;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <p className="text-gray-600" aria-live="polite">
          {match ? t("teamMatches.filter.found", { found: num(found), total: num(total) }) : summary}
        </p>
        <label className="flex items-center gap-2 border-b border-gray-300 focus-within:border-black transition-colors w-full sm:w-80">
          <span className="sr-only">{t("teamMatches.filter.search")}</span>
          <Search className="text-xl text-gray-400" />
          <input type="search" placeholder={t("teamMatches.filter.search")} value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 min-w-0 py-2 bg-transparent outline-none" />
          <ClearButton show={!!query} onClear={() => setQuery("")} />
        </label>
      </div>
      <Ties sections={sections} match={match} none={t("teamMatches.filter.noneFound")} className={className} />
    </>
  );
}

/** The sections with the team matches that `match` (all without), leaving out those with none; `none`: shown when none do */
function Ties({ sections, match, none, className }: { sections: TieSection[]; match?: (tie: TieItem) => boolean; none?: string; className?: string }) {
  const shown = match ? sections.map((s) => ({ ...s, ties: s.ties.filter(match) })).filter((s) => s.ties.length) : sections;
  if (match && !shown.length) return <p className="text-gray-600">{none}</p>;
  return (
    <div className={className}>
      {shown.map((section) => (
        <div key={section.key}>
          {section.heading}
          <ul className="grid gap-2">
            {section.ties.map((tie) => (
              <Fragment key={tie.id}>{tie.node}</Fragment>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
