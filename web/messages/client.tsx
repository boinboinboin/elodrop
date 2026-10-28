"use client";

// The page's language in client components: set once by the root layout (LanguageProvider), read
// with useI18n() for the same text and formatting as on the server (messages/i18n.ts).
import { createContext, type ReactNode, useContext } from "react";
import { createI18n, DEFAULT_LANGUAGE, type I18n, type Language } from "./i18n";

const LanguageContext = createContext<Language>(DEFAULT_LANGUAGE);

export function LanguageProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

/** The text and formatting of the page's language */
export const useI18n = (): I18n => createI18n(useContext(LanguageContext));
