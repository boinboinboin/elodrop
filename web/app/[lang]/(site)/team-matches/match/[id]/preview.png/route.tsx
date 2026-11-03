// A team match's link preview, at /team-matches/match/<id>/preview.png: the teams, the division and
// day, the result (and whether it was an upset) and the chances before with the lineups played, as a
// split bar (home, draw, away) as on the page
import { previewCard } from "@/components/seo/PreviewCard";
import { getTeamMatch } from "@/data/teamMatches";
import { createI18n, isLanguage } from "@/messages/i18n";
import { parseId } from "@/utils/parse";

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id: rawId } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const i18n = createI18n(lang);
  const { t, date } = i18n;
  const id = parseId(rawId);
  const tie = id !== null ? await getTeamMatch(id) : null;
  if (!tie) return new Response(null, { status: 404 });
  const c = tie.winChance;
  return previewCard(i18n, {
    kicker: t("seo.preview.teamMatch"),
    title: `${tie.home} – ${tie.away}`,
    subtitle: `${tie.division} · ${date(tie.day)}`,
    stats: [{ value: `${tie.score[0]}–${tie.score[1]}`, label: t(tie.upset ? "seo.preview.upsetResult" : "seo.preview.result") }],
    bar: c ? { names: [tie.home, tie.away], chance: c.win, draw: c.draw, drawLabel: t("teamMatches.match.draw") } : undefined,
  });
}
