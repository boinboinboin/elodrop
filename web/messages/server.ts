// The language of the page being rendered, in server components: from the URL's language segment
// (app/[lang], a root parameter: "/en/..." is English, everything else Norwegian through the
// rewrites in next.config.ts). Also inside "use cache" functions, where it becomes part of the key.
import { lang } from "next/root-params";
import { cache } from "react";
import { createI18n, DEFAULT_LANGUAGE, type I18n, isLanguage } from "./i18n";

/** The text and formatting of the page's language (messages/i18n.ts) */
export const getI18n = cache(async (): Promise<I18n> => {
  const value = await lang();
  return createI18n(isLanguage(value) ? value : DEFAULT_LANGUAGE);
});
