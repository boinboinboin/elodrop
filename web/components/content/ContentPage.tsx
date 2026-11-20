// A page written in the Studio (/about, /support; sanity/schemas/page.ts, data/sanity.ts getPage), a little more
// playful than the rest of the site (./Motion.tsx): the title's words rising in, the lead after them, then the content
// (./PortableBody.tsx) fading up part by part as it scrolls into view. The English site shows the Norwegian page,
// saying so, until it has its own; before either is published, the page's name and a line saying it's coming.
//
// Static: refreshed when the page is published (the Sanity webhook); with a stats block also when the numbers' files
// change (meta.json and the team matches' index, after each run: two or four small pages). In the Studio's preview
// (draft mode) it shows the draft instead, and follows it as it's edited (./PreviewRefresh.tsx).
import { toPlainText } from "@portabletext/react";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import Section from "@/components/ui/Section";
import { getPage } from "@/data/sanity";
import { getSiteNumbers } from "@/data/siteNumbers";
import { getI18n } from "@/messages/server";
import type { MessageKey } from "@/messages/i18n";
import type { PageBlock } from "@/types";
import { hyphenate } from "@/utils/hyphenate";
import { pageMetadata } from "@/utils/metadata";
import { Lead, MotionPage, Reveal, Title } from "@/components/ui/Motion";
import PortableBody from "./PortableBody";
import PreviewRefresh from "./PreviewRefresh";

/** The pages written in the Studio: their texts in the messages before one is published */
export type PageKey = "about" | "support" | "privacy";

/** The page's title and description for search results and link previews: as written, else from the messages */
export async function contentPageMetadata(pageKey: PageKey): Promise<Metadata> {
  const i18n = await getI18n();
  const page = await getPage(pageKey, i18n.lang);
  return pageMetadata(i18n, {
    title: page?.title ?? i18n.t(`pages.${pageKey}.title` as MessageKey),
    description: page?.description ?? page?.lead ?? i18n.t(`pages.${pageKey}.description` as MessageKey),
    path: `/${pageKey}`,
  });
}

export default async function ContentPage({ pageKey }: { pageKey: PageKey }) {
  const i18n = await getI18n();
  const { t, lang, date } = i18n;
  const page = await getPage(pageKey, lang);
  const content: PageBlock[] = page?.content ?? [];
  const numbers = content.some((b) => b._type === "stats") ? await getSiteNumbers() : {};
  const title = page?.title ?? t(`pages.${pageKey}.title` as MessageKey);
  const words = title.split(/\s+/).length;
  // Every FAQ's questions, for search engines (FAQPage)
  const faqs = content.flatMap((b) => (b._type === "faq" ? (b.items ?? []) : [])).filter((item) => item.question && item.answer?.length);

  return (
    <MotionPage>
      {/* In the Studio's preview: follows the draft as it's edited */}
      <PreviewRefresh />
      {pageKey === "about" && <JsonLd data={{ "@type": "AboutPage", name: title, inLanguage: page?.lang ?? lang }} />}
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@type": "FAQPage",
            mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: toPlainText(item.answer!) } })),
          }}
        />
      )}
      <Section>
        <Breadcrumbs trail={[{ label: title }]} />
        <Title text={hyphenate(title)} />
        {page?.lead && <Lead words={words}>{page.lead}</Lead>}
        {page && page.lang !== lang && <p className="mt-4 text-gray-600">{t("pages.notTranslated")}</p>}
      </Section>
      <Section>
        {page && content.length > 0 ? (
          <>
            <PortableBody content={content} numbers={numbers} i18n={i18n} />
            <Reveal className="mt-12">
              <p className="font-mono text-xs text-gray-500">{t("pages.updated", { date: date(page.updatedAt.slice(0, 10), "long") })}</p>
            </Reveal>
          </>
        ) : (
          <Reveal>
            <p className="text-lg text-gray-700">{t("pages.soon")}</p>
          </Reveal>
        )}
      </Section>
    </MotionPage>
  );
}
