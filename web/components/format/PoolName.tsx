// A discipline's name for buttons and tabs: the short code (MS, WS, MD, WD, XD) on phones, where
// five full names don't fit in a row, and the full name from tablet width up. The code is an
// <abbr> with the full name, for hovering and screen readers.
import type { Pool } from "@/types";
import { POOL_CODES, POOLS } from "@/utils/pools";

export default function PoolName({ pool }: { pool: Pool }) {
  return (
    <>
      <abbr title={POOLS[pool]} className="no-underline sm:hidden">{POOL_CODES[pool]}</abbr>
      <span className="hidden sm:inline">{POOLS[pool]}</span>
    </>
  );
}
