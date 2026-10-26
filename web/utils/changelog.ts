// The changelog (CHANGELOG.md at the repo's root, imported as text, see next.config.ts) as data,
// for the "What's new" page. Each version is "## vMAJOR.X.Y (YYYY-MM-DD)", optionally with a name
// after a colon (": launch"), then bullets, which may have bullets of their own under them.
import changelog from "../../CHANGELOG.md";

export interface ChangeItem {
  /** The bullet's text (Markdown: `code`, **bold** and [links](…)) */
  text: string;
  /** Bullets under it */
  items: string[];
}

export interface Release {
  version: string;
  major: number;
  x: number;
  y: number;
  /** "2026-10-26" */
  date: string;
  /** The name after the version, if any ("launch") */
  name: string | null;
  items: ChangeItem[];
}

const HEADING = /^## v(\d+)\.(\d+)\.(\d+) \((\d{4}-\d{2}-\d{2})\)(?::\s*(.+))?$/;

/** Every release, newest first, as in the file */
export function getReleases(): Release[] {
  const releases: Release[] = [];
  for (const line of changelog.split("\n")) {
    const heading = line.match(HEADING);
    if (heading) {
      const [, major, x, y, date, name] = heading;
      releases.push({ version: `${major}.${x}.${y}`, major: +major, x: +x, y: +y, date, name: name ?? null, items: [] });
      continue;
    }
    const release = releases.at(-1);
    const bullet = line.match(/^(\s*)- (.+)$/);
    if (!release || !bullet) continue;
    if (bullet[1].length === 0) release.items.push({ text: bullet[2], items: [] });
    else release.items.at(-1)?.items.push(bullet[2]);
  }
  return releases;
}

/** A big feature (a new X: v1.13.0), rather than an improvement or fix (v1.13.1) */
export const isFeature = (r: Release) => r.y === 0;

/**
 * A bullet split into its lead and the rest, at its first colon when that comes early ("Fixed: …",
 * "A front page: what elodrop is, …"), so the page can show the lead in bold. Without one, all rest.
 */
export function splitLead(text: string): { lead: string | null; rest: string } {
  const at = text.indexOf(": ");
  // Not inside `code` or a link (an odd number of backticks or an open bracket before it)
  const before = text.slice(0, at);
  if (at < 0 || at > 100 || (before.split("`").length - 1) % 2 === 1 || before.includes("[")) return { lead: null, rest: text };
  return { lead: before, rest: text.slice(at + 2) };
}

/** For developers rather than the site's visitors: the pipeline and the commands to run */
export const isTechnical = (text: string) => /^(Pipeline:|`|New packages:)/.test(text) || text.includes("pnpm ");

export type Inline = { type: "text" | "code" | "strong"; text: string } | { type: "link"; text: string; href: string };

/** A bullet's Markdown as parts: `code`, **bold**, [links](…) and plain text */
export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(/`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g)) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ type: "code", text: m[1] });
    else if (m[2] !== undefined) parts.push({ type: "strong", text: m[2] });
    else parts.push({ type: "link", text: m[3], href: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
