import { ArrowRight } from "@/components/SVG";
import Link from "@/components/ui/Link";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <Section>
      <h1 className="h1">{t("layout.notFound.title")}</h1>
      <p className="text-2xl mt-2 max-w-3xl">{t("layout.notFound.text")}</p>
      <p className="mt-4">
        <Link href="/rankings" className={TEXT_LINK}>{t("layout.notFound.back")} <ArrowRight /></Link>
      </p>
    </Section>
  );
}
