import { getMeta } from "@/lib/data";
import { date } from "@/lib/format";

/** When the ratings were last calculated */
export default async function UpdatedAt() {
  const meta = await getMeta();
  return meta ? <p>Ratings updated {date(meta.generatedAt, "long")}</p> : null;
}
