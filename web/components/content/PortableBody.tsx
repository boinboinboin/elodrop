// A written page's content (sanity/schemas/page.ts) in the site's type: paragraphs, headings (each H2 numbered in a
// chart colour, as the parts of /how-it-works), lists and links, and the blocks between them. Rendered on the server;
// the moving parts are in ./Motion.tsx: every paragraph, heading, list and block fades up as it scrolls into view.
//
// Links: a site path ("/rankings") goes through Link (the page's language), a full address through ExternalLink.
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import { ArrowRight } from "@/components/SVG";
import ExternalLink from "@/components/ui/ExternalLink";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import type { SiteNumbers } from "@/data/siteNumbers";
import type { I18n } from "@/messages/i18n";
import type { PageBlock, RichText, SanityImage } from "@/types";
import { PALETTE } from "@/utils/chart";
import { sanityImageUrl, sanitySrcSet } from "@/utils/sanityImage";
import { Accordion, CountUp, EmailLink, Reveal, Springy, WipeIn } from "@/components/ui/Motion";
import SiteStats from "./SiteStats";

type Block<T extends PageBlock["_type"]> = Extract<PageBlock, { _type: T }>;

/** A link in the text: on the site, another site, or an email */
function TextLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <>{children}</>;
  if (href.startsWith("/")) return <Link href={href} className={TEXT_LINK}>{children}</Link>;
  if (href.startsWith("mailto:")) return <a href={href} className={TEXT_LINK}>{children}</a>;
  return <ExternalLink href={href}>{children}</ExternalLink>;
}

const marks: PortableTextComponents["marks"] = {
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  link: ({ value, children }) => <TextLink href={value?.href}>{children}</TextLink>,
};
const lists: PortableTextComponents["list"] = {
  bullet: ({ children }) => (
    <Reveal>
      <ul className="list-disc pl-6 grid gap-2 marker:text-gray-400">{children}</ul>
    </Reveal>
  ),
  number: ({ children }) => (
    <Reveal>
      <ol className="list-decimal pl-6 grid gap-2 marker:text-gray-500 marker:font-mono marker:text-sm">{children}</ol>
    </Reveal>
  ),
};

/** Rich text inside a block (a FAQ answer, a person, a note): paragraphs and lists, appearing with their block */
function SmallText({ value }: { value?: RichText | null }) {
  if (!value?.length) return null;
  return (
    <PortableText
      value={value}
      components={{
        block: { normal: ({ children }) => <p>{children}</p> },
        list: { bullet: ({ children }) => <ul className="list-disc pl-6 grid gap-1">{children}</ul>, number: ({ children }) => <ol className="list-decimal pl-6 grid gap-1">{children}</ol> },
        marks,
      }}
    />
  );
}

/** An H2's number and colour: in turn, as the parts of /how-it-works */
function Numbered({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-3">
      <span aria-hidden="true" className="font-mono text-sm font-semibold" style={{ color: PALETTE[(number - 1) % 5] }}>
        {String(number).padStart(2, "0")}
      </span>
      <span>{children}</span>
    </span>
  );
}

function Figure({ value }: { value: Block<"figure"> }) {
  const image = value.image;
  if (!image?.url) return null;
  return (
    <Reveal>
      <figure>
        <WipeIn>
          {/* eslint-disable-next-line @next/next/no-img-element -- Sanity's image servers size and format it */}
          <img src={sanityImageUrl(image, 768)} srcSet={sanitySrcSet(image, 768)} sizes="(min-width: 48rem) 48rem, 100vw" alt={image.alt ?? ""} loading="lazy" decoding="async" className="w-full h-auto" style={aspect(image)} />
        </WipeIn>
        {value.caption && <figcaption className="mt-2 text-sm text-gray-600">{value.caption}</figcaption>}
      </figure>
    </Reveal>
  );
}
/** The cropped image's shape, so the page doesn't jump when it loads */
const aspect = (image: SanityImage) => {
  const c = image.crop ?? { left: 0, right: 0, top: 0, bottom: 0 };
  const w = image.width * (1 - c.left - c.right);
  const h = image.height * (1 - c.top - c.bottom);
  return w && h ? { aspectRatio: `${w} / ${h}` } : undefined;
};

function Person({ value }: { value: Block<"person"> }) {
  return (
    <Reveal>
      <div className="group bg-white p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
        {value.photo?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sanityImageUrl(value.photo, 192)}
            srcSet={sanitySrcSet(value.photo, 96)}
            sizes="6rem"
            alt=""
            loading="lazy"
            className="w-24 h-24 rounded-full object-cover shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-3 group-hover:scale-105"
          />
        )}
        <div className="min-w-0 grid gap-2">
          <div>
            <p className="text-2xl">{value.name}</p>
            {value.role && <p className="font-mono text-xs uppercase tracking-widest text-gray-600 mt-1">{value.role}</p>}
          </div>
          <div className="grid gap-2 text-gray-700">
            <SmallText value={value.text} />
          </div>
          {value.link && (
            <p>
              <TextLink href={value.link}>{value.linkLabel || value.link.replace(/^https?:\/\/(www\.)?/, "")}</TextLink>
            </p>
          )}
        </div>
      </div>
    </Reveal>
  );
}

function LinkButton({ value }: { value: Block<"linkButton"> }) {
  if (!value.href || !value.label) return null;
  const filled = value.style !== "secondary";
  const className = `inline-flex items-center gap-2 px-5 py-3 border border-black transition-colors ${filled ? "bg-black text-white hover:bg-gray-800" : "hover:bg-black hover:text-white"}`;
  const inner = (
    <>
      {value.label} <ArrowRight />
    </>
  );
  return (
    <Reveal>
      <Springy>
        {value.href.startsWith("/") ? (
          <Link href={value.href} className={className}>{inner}</Link>
        ) : (
          <a href={value.href} className={className} rel="noopener">{inner}</a>
        )}
      </Springy>
    </Reveal>
  );
}

function Note({ value }: { value: Block<"note"> }) {
  // Information in the first chart colour (as the first heading's number), a warning in red
  const color = value.tone === "warning" ? "var(--color-red-600)" : PALETTE[0];
  return (
    <Reveal>
      <div className="bg-white border-l-4 p-4 sm:p-5 grid gap-2" style={{ borderColor: color }}>
        <SmallText value={value.text} />
      </div>
    </Reveal>
  );
}

function Email({ value, t }: { value: Block<"contact">; t: I18n["t"] }) {
  const [user, domain] = (value.address ?? "").split("@");
  if (!user || !domain) return null;
  return (
    <Reveal>
      <div className="bg-white p-5 sm:p-6 grid gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-gray-600">{value.label || t("pages.email.label")}</p>
        <EmailLink user={user} domain={domain} copyLabel={t("pages.email.copy")} copiedLabel={t("pages.email.copied")} />
        {value.note && <p className="text-gray-600">{value.note}</p>}
      </div>
    </Reveal>
  );
}

/** The numbers block: the site's numbers counting up, each tile fading up after the one before */
function Stats({ value, numbers, i18n }: { value: Block<"stats">; numbers: SiteNumbers; i18n: I18n }) {
  return (
    <SiteStats
      items={value.items ?? []}
      numbers={numbers}
      i18n={i18n}
      value={(n) => <CountUp value={n} locale={i18n.locale} />}
      wrap={(tile, key, i) => (
        <Reveal key={key} delay={i * 0.08}>
          {tile}
        </Reveal>
      )}
    />
  );
}

/** The page's content; `numbers`: the site's numbers for its stats blocks */
export default function PortableBody({ content, numbers, i18n }: { content: PageBlock[]; numbers: SiteNumbers; i18n: I18n }) {
  // Each H2 (and FAQ heading) numbered in order
  const numbersByKey = new Map<string, number>();
  for (const block of content) {
    if ((block._type === "block" && block.style === "h2") || (block._type === "faq" && block.heading)) numbersByKey.set(block._key!, numbersByKey.size + 1);
  }
  const components: PortableTextComponents = {
    block: {
      normal: ({ children }) => (
        <Reveal>
          <p>{children}</p>
        </Reveal>
      ),
      h2: ({ children, value }) => (
        <Reveal className="mt-8 first:mt-0">
          <h2 className="text-3xl">
            <Numbered number={numbersByKey.get(value._key!) ?? 1}>{children}</Numbered>
          </h2>
        </Reveal>
      ),
      h3: ({ children }) => (
        <Reveal className="mt-4">
          <h3 className="text-2xl">{children}</h3>
        </Reveal>
      ),
    },
    list: lists,
    marks,
    types: {
      faq: ({ value }: { value: Block<"faq"> }) => {
        const items = (value.items ?? []).filter((item) => item.question).map((item) => ({ key: item._key, question: item.question!, answer: <SmallText value={item.answer} /> }));
        if (!items.length) return null;
        return (
          <section className="mt-8 first:mt-0">
            {value.heading && (
              <Reveal>
                <h2 className="text-3xl mb-4">
                  <Numbered number={numbersByKey.get(value._key) ?? 1}>{value.heading}</Numbered>
                </h2>
              </Reveal>
            )}
            <Accordion items={items} />
          </section>
        );
      },
      figure: ({ value }) => <Figure value={value} />,
      person: ({ value }) => <Person value={value} />,
      linkButton: ({ value }) => <LinkButton value={value} />,
      note: ({ value }) => <Note value={value} />,
      contact: ({ value }) => <Email value={value} t={i18n.t} />,
      stats: ({ value }) => <Stats value={value} numbers={numbers} i18n={i18n} />,
    },
  };
  return (
    <div className="grid gap-5 text-lg max-w-3xl">
      <PortableText value={content as RichText} components={components} />
    </div>
  );
}
