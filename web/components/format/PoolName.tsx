"use client";

// A discipline's name for buttons and tabs: the short code (MS, WS, MD, WD, XD) on phones, where
// five full names don't fit in a row, and the full name from tablet width up. The code is an
// <abbr> with the full name, for hovering and screen readers.
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";

export default function PoolName({ pool }: { pool: Pool }) {
  const { pools, poolCodes } = useI18n();
  return (
    <>
      <abbr title={pools[pool]} className="no-underline sm:hidden">{poolCodes[pool]}</abbr>
      <span className="hidden sm:inline">{pools[pool]}</span>
    </>
  );
}
