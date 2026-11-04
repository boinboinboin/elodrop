"use client";

// next/link in the page's language: the site's addresses are written without a language
// ("/players/1"), and on an English page an internal one gets "/en" in front (messages/i18n.ts href).
// Every internal link goes through this, not next/link.
//
// Prefetched on intent (the pointer over it, keyboard focus, a touch), not when it scrolls into view: next/link's
// default would fetch every link on screen, and a player's page has hundreds of links to other players. Each fetch of a
// page that the nightly refresh has made stale renders it again on the server (a function run and an ISR write) for
// a page nobody may open. A link given its own `prefetch` keeps it.
import NextLink from "next/link";
import { useState, type ComponentProps } from "react";
import { useI18n } from "@/messages/client";

export default function Link({ href, prefetch, onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof NextLink>) {
  const { href: localize } = useI18n();
  // Until the visitor heads for it no prefetching (false), then next/link's default (null)
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      href={typeof href === "string" ? localize(href) : href}
      prefetch={prefetch !== undefined ? prefetch : intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setIntent(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
      {...props}
    />
  );
}
