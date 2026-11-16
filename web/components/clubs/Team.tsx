// A team or club name with its logo, linking to the club page when the club has an entry.
// `clubs`: club entries by short name (data/sanity.ts getClubMap); `size` is the logo size in Tailwind
// units (default 6); `stacked` puts the logo above the name; `club` is the club when the name is a
// team's ("Sandefjord 2"); `pool` opens the club page on that discipline.
import { Fragment } from "react";
import LogoImage from "@/components/clubs/LogoImage";
import Link from "@/components/ui/Link";
import type { ClubEntry, Pool } from "@/types";
import { clubHref } from "@/utils/hrefs";

interface Props {
  name: string;
  /** The club, when it isn't the name (a league team's: "Sandefjord" for "Sandefjord 2") */
  club?: string | null;
  clubs: Record<string, ClubEntry>;
  size?: number;
  stacked?: boolean;
  /** Link to the club page (false inside another link) */
  linked?: boolean;
  /** The discipline the club page opens on (a player's club beside a match in it) */
  pool?: Pool;
  className?: string;
}

/** A combined team's name ("Lambertseter/Frogner") may break after each slash, on narrow screens */
export const breakable = (name: string) =>
  name.split("/").map((part, i, parts) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <>/<wbr /></>}
    </Fragment>
  ));

export default function Team({ name, club, clubs, size = 6, stacked = false, linked = true, className = "", pool }: Props) {
  const entry = clubs[club ?? name];
  const inner = (
    <>
      {entry?.logo && <LogoImage src={entry.logo} size={size} invert={entry.logoInvert} />}
      <span>{breakable(name)}</span>
    </>
  );
  const classes = `inline-flex ${stacked ? "flex-col" : ""} items-center gap-1.5 align-middle ${className}`;
  return entry && linked ? (
    <Link href={clubHref(entry.slug, pool)} className={`${classes} hover:text-blue-600`}>
      {inner}
    </Link>
  ) : (
    <span className={classes}>{inner}</span>
  );
}

/** Just the club's logo (if any), named for screen readers and on hover */
export function ClubLogo({ name, clubs, size = 4 }: { name: string | null; clubs: Record<string, ClubEntry>; size?: number }) {
  const entry = name ? clubs[name] : undefined;
  if (!name || !entry?.logo) return null;
  return <LogoImage src={entry.logo} size={size} invert={entry.logoInvert} alt={name} title={name} />;
}
