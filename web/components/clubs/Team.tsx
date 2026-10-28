// A team or club name with its logo, linking to the club page when the club has an entry.
// `clubs`: club entries by short name (data/sanity.ts getClubMap); `size` is the logo size in Tailwind
// units (default 6); `stacked` puts the logo above the name.
import Link from "@/components/ui/Link";
import type { ClubEntry } from "@/types";
import { logoSrc } from "@/utils/clubs";
import { clubHref } from "@/utils/hrefs";

interface Props {
  name: string;
  clubs: Record<string, ClubEntry>;
  size?: number;
  stacked?: boolean;
  className?: string;
}

export default function Team({ name, clubs, size = 6, stacked = false, className = "" }: Props) {
  const entry = clubs[name];
  const inner = (
    <>
      {entry?.logo && (
        // eslint-disable-next-line @next/next/no-img-element -- small logos from the CMS or public/
        <img src={logoSrc(entry.logo, size)} alt="" className="object-contain shrink-0" style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }} />
      )}
      <span>{name}</span>
    </>
  );
  const classes = `inline-flex ${stacked ? "flex-col" : ""} items-center gap-1.5 align-middle ${className}`;
  return entry ? (
    <Link href={clubHref(entry.slug)} className={`${classes} hover:text-blue-600`}>
      {inner}
    </Link>
  ) : (
    <span className={classes}>{inner}</span>
  );
}

/** Just the club's logo (if any), named for screen readers and on hover */
export function ClubLogo({ name, clubs, size = 4 }: { name: string | null; clubs: Record<string, ClubEntry>; size?: number }) {
  const logo = name ? clubs[name]?.logo : null;
  if (!logo) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={logoSrc(logo, size)} alt={name ?? ""} title={name ?? ""} className="object-contain shrink-0" style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }} />;
}
