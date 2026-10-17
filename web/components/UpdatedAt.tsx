import { getMeta } from "@/lib/data";
import { dateTime } from "@/lib/format";

/** When the pipeline last finished fetching, rating and building the site's data, in Norwegian time */
export default async function UpdatedAt() {
  const meta = await getMeta();
  return meta ? <p>Updated {dateTime(meta.updatedAt ?? meta.generatedAt)}</p> : null;
}
