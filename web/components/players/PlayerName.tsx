// A player's name in a match or an upset: a link to their page, or plain text for a player without
// one (id null: not identified in a Profixio tournament, 2008-2014, see pipeline/profixio-players.mjs).
// `className` styles the name either way, `linkClassName` only the link.
import Link from "@/components/ui/Link";
import type { Pool } from "@/types";
import { playerHref } from "@/utils/hrefs";

interface Props {
  id: number | null;
  name: string;
  /** The match's discipline: the player's page opens on it */
  pool?: Pool;
  className?: string;
  linkClassName?: string;
}

export default function PlayerName({ id, name, pool, className = "", linkClassName = "" }: Props) {
  if (id === null) return <span className={className || undefined}>{name}</span>;
  return (
    <Link href={playerHref(id, pool)} className={`${linkClassName} ${className}`.trim() || undefined}>
      {name}
    </Link>
  );
}
