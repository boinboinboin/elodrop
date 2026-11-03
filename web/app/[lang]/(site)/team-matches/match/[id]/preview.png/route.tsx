// A team match's link preview, at /team-matches/match/<id>/preview.png: the teams, the division and
// day, the result (and whether it was an upset) and the chance the winner had with the lineups played
import { previewCard } from "@/components/seo/PreviewCard";
import { getTeamMatch } from "@/data/teamMatches";
import { createI18n, isLanguage } from "@/messages/i18n";
import { parseId } from "@/utils/parse";

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id: rawId } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const i18n = createI18n(lang);
  const { t, chance, date } = i18n;
  const id = parseId(rawId);
  const tie = id !== null ? await getTeamMatch(id) : null;
  if (!tie) return new Response(null, { status: 404 });
  // The winner's chance (the home team's after a draw): its win chance, from the home team's
  const c = tie.winChance;
  const team = tie.winner === 2 ? tie.away : tie.home;
  const teamChance = c ? (tie.winner === 2 ? c.loss : c.win) : null;
  return previewCard(i18n, {
    kicker: t("seo.preview.teamMatch"),
    title: `${tie.home} – ${tie.away}`,
    subtitle: `${tie.division} · ${date(tie.day)}`,
    stats: [
      { value: `${tie.score[0]}–${tie.score[1]}`, label: t(tie.upset ? "seo.preview.upsetResult" : "seo.preview.result") },
      ...(teamChance !== null ? [{ value: chance(teamChance), label: t("seo.preview.teamChance", { team }) }] : []),
    ],
  });
}
