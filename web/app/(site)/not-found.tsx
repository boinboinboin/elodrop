import Link from "next/link";
import { ArrowRight } from "@/components/SVG";
import Section from "@/components/ui/Section";
import { TEXT_LINK } from "@/components/ui/styles";
import { t } from "@/messages/i18n";

export default function NotFound() {
  return (
    <Section>
      <h1 className="h1">{t("layout.notFound.title")}</h1>
      <p className="text-2xl mt-2 max-w-3xl">{t("layout.notFound.text")}</p>
      <p className="mt-4">
        <Link href="/" className={TEXT_LINK}>{t("layout.notFound.back")} <ArrowRight /></Link>
      </p>
    </Section>
  );
}
