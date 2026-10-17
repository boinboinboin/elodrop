import { getMeta } from "@/lib/data";
import { dateTime } from "@/lib/format";

/** When the ratings were last calculated, in Norwegian time */
export default async function UpdatedAt() {
  const meta = await getMeta();
  return meta ? <p>Ratings updated {dateTime(meta.generatedAt)}</p> : null;
}
