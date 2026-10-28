// One version on the "What's new" page: its number (a link to itself), whether it brought something
// new or improved what was there, and its changes. A change with a lead ("Fixed: …", "A front page:
// …") shows the lead as its title; changes for developers (the pipeline, commands) come last, smaller.
import Badge from "@/components/ui/Badge";
import { TEXT_LINK } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import { type ChangeItem, type Release as ReleaseData, isFeature, isTechnical, parseInline, splitLead } from "@/utils/changelog";
import { repoHref } from "@/utils/hrefs";

/** The anchor of a version on the page ("v1-14-0") */
export const releaseId = (r: ReleaseData) => `v${r.version.replaceAll(".", "-")}`;

export default async function Release({ release, color }: { release: ReleaseData; color: string }) {
  const { t } = await getI18n();
  const launch = release.name === "launch";
  const feature = isFeature(release);
  const items = release.items.filter((i) => !isTechnical(i.text));
  const technical = release.items.filter((i) => isTechnical(i.text));
  return (
    <article id={releaseId(release)} className="bg-white px-4 pb-5 sm:px-5 md:px-6 md:pb-6 scroll-mt-20 [overflow-wrap:anywhere]">
      {/* A coloured top edge on new features and the launch, a plain line on the rest */}
      <div aria-hidden="true" className="h-1 -mx-4 sm:-mx-5 md:-mx-6 mb-4 md:mb-5" style={{ background: feature || launch ? color : "var(--color-gray-200)" }} />
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <a href={`#${releaseId(release)}`} className="font-mono text-sm text-gray-600 hover:text-black">v{release.version}</a>
        {launch ? (
          <Badge className="border-black! text-black!">{t("whatsNew.launch")}</Badge>
        ) : (
          <KindBadge feature={feature} />
        )}
      </header>
      {launch && <h3 className="text-2xl mb-3">{t("whatsNew.launchTitle")}</h3>}
      <ul className="grid gap-4">
        {items.map((item, i) => (
          <Change key={i} item={item} />
        ))}
      </ul>
      {technical.length > 0 && (
        <div className="mt-5 pt-3 border-t border-gray-100 text-sm text-gray-600">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{t("whatsNew.developers")}</p>
          <ul className="grid gap-1">
            {technical.map((item, i) => (
              <li key={i}><Markdown text={item.text} /></li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/** "New" (filled) for a new feature, "Improved" (outlined) for improvements and fixes */
export const KindBadge = async ({ feature }: { feature: boolean }) => {
  const { t } = await getI18n();
  return feature ? (
    <span className="inline-block text-xs px-1.5 py-0.5 border border-black rounded bg-black text-white">{t("whatsNew.feature")}</span>
  ) : (
    <Badge>{t("whatsNew.improvement")}</Badge>
  );
};

function Change({ item }: { item: ChangeItem }) {
  const { lead, rest } = splitLead(item.text);
  return (
    <li className="max-w-3xl">
      {lead && <p className="font-semibold"><Markdown text={lead} /></p>}
      <p className={lead ? "text-gray-700" : ""}>
        <Markdown text={capitalizeFirst(rest, lead !== null)} />
      </p>
      {item.items.length > 0 && (
        <ul className="mt-2 grid gap-1.5 text-gray-700 pl-4 border-l-2 border-gray-200">
          {item.items.map((sub, i) => (
            <li key={i}><Markdown text={sub} /></li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** After a lead the rest starts a sentence of its own ("in the 2025/26 …" → "In the 2025/26 …") */
const capitalizeFirst = (text: string, apply: boolean) => (apply && /^[a-zæøå]/.test(text) ? text[0].toUpperCase() + text.slice(1) : text);

/** A changelog bullet's Markdown: `code`, **bold** and links (paths in the repo link to GitHub) */
export async function Markdown({ text }: { text: string }) {
  const { href: localize } = await getI18n();
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "code") return <code key={i} className="font-mono text-[0.9em] bg-gray-100 px-1 py-0.5 rounded break-words">{part.text}</code>;
        if (part.type === "strong") return <strong key={i}>{part.text}</strong>;
        if (part.type === "link") {
          const href = part.href.startsWith("/") ? localize(part.href) : /^(https?:|#)/.test(part.href) ? part.href : repoHref(part.href);
          return <a key={i} href={href} className={TEXT_LINK}>{part.text}</a>;
        }
        return part.text;
      })}
    </>
  );
}
