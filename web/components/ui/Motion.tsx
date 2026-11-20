"use client";

// The moving parts of the pages about the site, with the motion library. The written pages (About, Help & support;
// components/content) use them all, a little more playful than the rest of the site: the title's words rising in one
// after another, each part fading up as it scrolls into view (once), images wiped in, numbers counting up, FAQ
// answers sliding open, buttons that give a little on hover and press, and the email's copy button. How it works,
// Achievements and What's new use only the quiet ones: the title, the intro, and their parts fading up.
//
// With reduced motion (the system setting) nothing moves but fades (MotionConfig reducedMotion="user"). The
// server's HTML has the parts' starting look (faded out), so without JavaScript MotionPage's <noscript> rule shows
// them as they end; search engines read the text either way.
import { AnimatePresence, animate, motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check } from "@/components/SVG";

/** The easing of every entrance: quick, then settling softly */
const EASE = [0.22, 1, 0.36, 1] as const;

// Without JavaScript the parts would stay as they start (faded out): shown as they end instead
const NO_SCRIPT = "[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}";

/** Around a page using these: reduced motion respected, and everything shown without JavaScript */
export function MotionPage({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <noscript>
        <style>{NO_SCRIPT}</style>
      </noscript>
      {children}
    </MotionConfig>
  );
}

const TAGS = { div: motion.div, section: motion.section, li: motion.li } as const;

/**
 * Fades up into place when scrolled into view (once); `delay` in seconds. `as`: the element it is (a div, or a
 * section or list item that must stay one: a grid's or list's own child); other props (id, aria-*) pass through.
 */
export function Reveal({ children, delay = 0, className = "", as = "div", ...props }: { children: ReactNode; delay?: number; className?: string; as?: keyof typeof TAGS } & Pick<ComponentProps<"div">, "id" | "aria-label" | "aria-labelledby">) {
  const Tag = TAGS[as] as typeof motion.div;
  return (
    <Tag
      {...props}
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** The page's title, its words rising in one after another (the text is hyphenated where marked: utils/hyphenate.ts) */
export function Title({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <h1 className="h1 mt-4" aria-label={text.replaceAll("­", "")}>
      {words.map((word, i) => (
        <span key={i} aria-hidden="true">
          {/* Clipped, so each word rises from below its own line */}
          <span className="inline-block max-w-full overflow-hidden align-bottom pb-[0.08em]">
            <motion.span
              data-reveal
              className="inline-block"
              initial={{ y: "105%", rotate: 3 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.05 + i * 0.07 }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </h1>
  );
}

/** The lead under the title, after the title's words */
export function Lead({ children, words, className = "mt-3" }: { children: ReactNode; words: number; className?: string }) {
  return (
    <motion.p data-reveal className={`text-2xl max-w-3xl ${className}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.25 + words * 0.07 }}>
      {children}
    </motion.p>
  );
}

/** An image wiped in from the left as it scrolls into view, settling from a slight zoom */
export function WipeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      data-reveal
      className={`overflow-hidden ${className}`}
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1, ease: EASE }}
    >
      <motion.div initial={{ scale: 1.08 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** A number counting up from 0 when it comes into view; the server's HTML has the number itself */
export function CountUp({ value, locale }: { value: number; locale: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const format = (n: number) => Math.round(n).toLocaleString(locale);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!inView) {
      el.textContent = format(0);
      return;
    }
    const controls = animate(0, value, { duration: 1.6, ease: EASE, onUpdate: (n) => (el.textContent = format(n)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- format depends only on locale
  }, [inView, reduced, value, locale]);
  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}

/** A FAQ: each question a button that slides its answer open (the answers stay in the page for search engines) */
export function Accordion({ items }: { items: { key: string; question: string; answer: ReactNode }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const id = useId();
  return (
    <ul className="border-t border-gray-300">
      {items.map((item, i) => {
        const isOpen = open === item.key;
        return (
          <motion.li
            key={item.key}
            data-reveal
            className="border-b border-gray-300"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -5% 0px" }}
            transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
          >
            <h3>
              <button
                type="button"
                id={`${id}-${item.key}-q`}
                aria-expanded={isOpen}
                aria-controls={`${id}-${item.key}-a`}
                onClick={() => setOpen(isOpen ? null : item.key)}
                className="group link-host w-full flex items-center justify-between gap-4 py-4 text-left text-xl cursor-pointer hover:text-blue-600 transition-colors"
              >
                {/* The line in an inline span inside the flex item (a flex item is a block, whose line would run once
                    under the whole box), so each line of a question that wraps gets its own */}
                <span className="min-w-0">
                  <span className="link-group">{item.question}</span>
                </span>
                {/* A plus that turns into a cross */}
                <motion.span aria-hidden="true" className="relative shrink-0 w-5 h-5" animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <span className="absolute left-0 top-1/2 w-5 h-0.5 -translate-y-1/2 bg-current" />
                  <span className="absolute top-0 left-1/2 h-5 w-0.5 -translate-x-1/2 bg-current" />
                </motion.span>
              </button>
            </h3>
            <motion.div
              id={`${id}-${item.key}-a`}
              role="region"
              aria-labelledby={`${id}-${item.key}-q`}
              inert={!isOpen}
              className="overflow-hidden"
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ height: { duration: 0.45, ease: EASE }, opacity: { duration: 0.3 } }}
            >
              <div className="pb-5 grid gap-3 text-lg text-gray-700 max-w-prose">{item.answer}</div>
            </motion.div>
          </motion.li>
        );
      })}
    </ul>
  );
}

/** Gives a little on hover and press: around a button or a card */
export function Springy({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={`inline-block ${className}`} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
      {children}
    </motion.div>
  );
}

/**
 * An email address, put together in the browser from its parts (so it isn't in the page's HTML for address
 * harvesters), as a mailto link with a copy button that turns into a check when copied
 */
export function EmailLink({ user, domain, copyLabel, copiedLabel }: { user: string; domain: string; copyLabel: string; copiedLabel: string }) {
  // Only in the browser (the server's HTML has neither part joined): false on the server and while hydrating
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [copied, setCopied] = useState(false);
  const address = inBrowser ? `${user}@${domain}` : null;
  if (!address) return <span className="text-2xl text-gray-400">…</span>;
  return (
    <span className="flex flex-wrap items-center gap-3">
      <a href={`mailto:${address}`} className="text-2xl [overflow-wrap:anywhere] link-underlined hover:text-blue-600">
        {address}
      </a>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(address).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="relative inline-flex items-center justify-center h-9 px-3 border border-black text-sm cursor-pointer transition-colors hover:bg-black hover:text-white overflow-hidden"
        aria-live="polite"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? "done" : "copy"} className="inline-flex items-center gap-1.5" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.2 }}>
            {copied && <Check />}
            {copied ? copiedLabel : copyLabel}
          </motion.span>
        </AnimatePresence>
      </button>
    </span>
  );
}
