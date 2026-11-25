// A member's story as the Studio's draft (web/sanity/schemas/matchStory.ts): its text as paragraphs (Portable Text
// blocks, parted by empty lines) in the language it was written in, its source, who told it (their username, if they
// said so) and the submission it came from. Its id follows from the submission's: the draft is drafts.<id>, and the
// owner's publishing it makes <id>.

export interface Submission {
  id: number;
  author: string | null;
  match_key: string;
  match_summary: string;
  story: string;
  source_name: string | null;
  source_url: string | null;
  show_name: boolean;
  lang: "nb" | "en";
}

/** The published document's id for a submission (its draft: drafts.<id>) */
export const storyId = (submission: number) => `matchStory-sub-${submission}`;

const key = (n: number, m: number) => `s${n}x${m}`;

/** Text as Portable Text paragraphs: one per run of text between empty lines, its lines joined by spaces */
export function blocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((p, i) => ({ _type: "block", _key: key(i, 0), style: "normal", markDefs: [], children: [{ _type: "span", _key: key(i, 1), text: p, marks: [] }] }));
}

export function draft(s: Submission, nickname: string | null) {
  const source = s.source_name || s.source_url ? { name: s.source_name ?? undefined, url: s.source_url ?? undefined } : undefined;
  return {
    _id: `drafts.${storyId(s.id)}`,
    _type: "matchStory",
    match: s.match_key,
    matchSummary: s.match_summary,
    [s.lang === "en" ? "storyEn" : "story"]: blocks(s.story),
    ...(source ? { source } : {}),
    ...(s.show_name && nickname ? { teller: nickname } : {}),
    submission: s.id,
  };
}
