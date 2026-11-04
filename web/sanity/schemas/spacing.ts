// A warning on text with spaces at its ends or two in a row ("Rud ", "Oslofjorden  Badmintonkrets"):
// the site cleans them away (data/sanity.ts), but the Studio's own matching and lists see them as typed.
import type { SlugRule, StringRule } from "sanity";

const MESSAGE = "Extra spaces: remove the spaces at the start or end, or the double space";
const untidy = (text: string) => text !== text.trim() || /\s{2}/.test(text);

/** For a text field */
export const tidyText = (rule: StringRule) => rule.custom((value) => (value && untidy(value) ? MESSAGE : true)).warning();

/** For a slug field (its text is in `current`) */
export const tidySlug = (rule: SlugRule) => rule.custom((value) => (value?.current && untidy(value.current) ? MESSAGE : true)).warning();
