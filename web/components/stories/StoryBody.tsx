"use client";

// A match's story (sanity/schemas/matchStory.ts; data/sanity.ts): its title, its paragraphs with their links, and who told
// it and where it comes from. Under a match in a list (MatchTable, UpsetStory) with `more` (a link to the stories page),
// and on the stories page itself. A link to a page of the site goes through Link (the page's language), any other
// address through ExternalLink.
import ExternalLink from "@/components/ui/ExternalLink";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { MatchStory, StorySpan } from "@/types";

function Span({ span }: { span: StorySpan }) {
  let text: React.ReactNode = span.text;
  if (span.em) text = <em>{text}</em>;
  if (span.strong) text = <strong className="font-semibold">{text}</strong>;
  if (!span.href) return text;
  return span.href.startsWith("/") ? <Link href={span.href} className={TEXT_LINK}>{text}</Link> : <ExternalLink href={span.href}>{text}</ExternalLink>;
}

/** `boxed`: with a coloured line down its left side, set apart from the match above it */
export default function StoryBody({ story, title = true, more = false, boxed = false, className = "" }: { story: MatchStory; title?: boolean; more?: boolean; boxed?: boolean; className?: string }) {
  const { t } = useI18n();
  const { source, teller } = story;
  return (
    <div className={`grid gap-2 ${boxed ? "border-l-4 pl-3 sm:pl-4 py-1" : ""} ${className}`} style={boxed ? { borderColor: "var(--color-chart-5)" } : undefined}>
      {title && story.title && <p className="font-semibold">{story.title}</p>}
      {story.story.map((paragraph, i) => (
        <p key={i} className="text-gray-700">
          {paragraph.map((span, j) => (
            <Span key={j} span={span} />
          ))}
        </p>
      ))}
      {(teller || source || more) && (
        <p className="text-sm text-gray-600">
          {teller && t("stories.toldBy", { name: teller })}
          {teller && source && " · "}
          {source && (
            <>
              {t("stories.source")}{" "}
              {source.url ? (
                <ExternalLink href={source.url} rel="noopener ugc">{source.name ?? new URL(source.url).hostname.replace(/^www\./, "")}</ExternalLink>
              ) : (
                source.name
              )}
            </>
          )}
          {more && (
            <>
              {(teller || source) && " · "}
              <Link href="/stories" className={TEXT_LINK}>{t("stories.more")}</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
