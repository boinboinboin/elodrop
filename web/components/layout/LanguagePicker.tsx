"use client";

// Norsk or English, in the menu (components/layout/MenuButton.tsx): the same page in the other
// language. Each name is in its own language; Norwegian is at the site's root, English under /en.
import { usePathname } from "next/navigation";
import { useI18n } from "@/messages/client";
import { type Language, LANGUAGES, splitLanguage } from "@/messages/i18n";

const NAMES: Record<Language, string> = { nb: "Norsk", en: "English" };

export default function LanguagePicker({ onPick }: { onPick: () => void }) {
  const { lang } = useI18n();
  const { path } = splitLanguage(usePathname());
  return (
    <ul className="flex gap-2">
      {LANGUAGES.map((code) => (
        <li key={code}>
          {/* A plain link: the other language is another root layout, so it's a full page load anyway */}
          <a
            href={code === "en" ? (path === "/" ? "/en" : `/en${path}`) : path}
            hrefLang={code}
            lang={code}
            onClick={onPick}
            aria-current={code === lang ? "true" : undefined}
            className={`block px-3 py-1 text-sm border transition-colors duration-200 ${code === lang ? "bg-gray-800 border-gray-800 text-white" : "border-gray-400 hover:border-black"}`}
          >
            {NAMES[code]}
          </a>
        </li>
      ))}
    </ul>
  );
}
