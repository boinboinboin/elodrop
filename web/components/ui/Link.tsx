"use client";

// next/link in the page's language: the site's addresses are written without a language
// ("/players/1"), and on an English page an internal one gets "/en" in front (messages/i18n.ts href).
// Every internal link goes through this, not next/link.
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useI18n } from "@/messages/client";

export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { href: localize } = useI18n();
  return <NextLink href={typeof href === "string" ? localize(href) : href} {...props} />;
}
