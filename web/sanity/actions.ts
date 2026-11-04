// The tournament's Publish button: publishing an approved tournament with its organiser and hall set
// also adds the hall to the organiser's home halls (club.homeVenues), at the end so the club's
// default stays first (a club without home halls gets it as its first). Also the club's unpublished
// changes, if it has any, so publishing them doesn't drop it.
import { useClient, type DocumentActionComponent, type DocumentActionsResolver, type SanityClient } from "sanity";

interface Tournament {
  approved?: boolean;
  organiser?: { _ref?: string };
  venue?: { _ref?: string };
}

async function addHomeHall(client: SanityClient, clubId: string, hallId: string) {
  const clubs = await client.fetch<{ _id: string; halls: string[] | null }[]>(`*[_id in $ids]{ _id, "halls": homeVenues[]._ref }`, { ids: [clubId, `drafts.${clubId}`] });
  const missing = clubs.filter((c) => !c.halls?.includes(hallId));
  if (!missing.length) return;
  const tx = client.transaction();
  for (const c of missing) tx.patch(c._id, (p) => p.setIfMissing({ homeVenues: [] }).append("homeVenues", [{ _type: "reference", _ref: hallId, _key: crypto.randomUUID().slice(0, 12) }]));
  await tx.commit();
}

function withHomeHall(publish: DocumentActionComponent): DocumentActionComponent {
  const Publish: DocumentActionComponent = (props) => {
    const client = useClient({ apiVersion: "2025-02-19" });
    const action = publish(props);
    if (!action) return action;
    return {
      ...action,
      onHandle: () => {
        const t = (props.draft ?? props.published) as Tournament | null;
        action.onHandle?.();
        const club = t?.organiser?._ref;
        const hall = t?.venue?._ref;
        if (t?.approved && club && hall)
          addHomeHall(client, club, hall).catch((error) => {
            console.error(error);
            window.alert(`Published, but the hall couldn't be added to the organiser's home halls: ${error.message}`);
          });
      },
    };
  };
  Publish.action = publish.action;
  return Publish;
}

export const actions: DocumentActionsResolver = (previous, { schemaType }) =>
  schemaType === "tournament" ? previous.map((action) => (action.action === "publish" ? withHomeHall(action) : action)) : previous;
