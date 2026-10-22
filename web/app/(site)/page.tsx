// The front page: men's singles ranking (the other lists are at /rankings/<list>, utils/rankings.ts).
// Fully static: rendered once per data update.
import { Suspense } from "react";
import Rankings from "@/components/rankings/Rankings";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import { t } from "@/messages/i18n";
import { RANKING_LISTS } from "@/utils/rankings";

export default function Home() {
  return (
    <>
      <Section>
        <h1 className="h1">{t("rankings.home.title")}</h1>
        <p className="text-2xl max-w-3xl mt-2">{t("rankings.home.intro")}</p>
      </Section>
      <Suspense fallback={<Loading label={t("rankings.loading")} />}>
        <Rankings list={RANKING_LISTS.men} showInactive={false} />
      </Suspense>
    </>
  );
}
