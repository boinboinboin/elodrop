import { getMeta } from "@/data/meta";
import { getI18n } from "@/messages/server";

/** When the pipeline last finished fetching, rating and building the site's data, in Norwegian time */
export default async function UpdatedAt() {
  const { t, dateTime } = await getI18n();
  const meta = await getMeta();
  return meta ? <p>{t("layout.footer.updated", { time: dateTime(meta.updatedAt ?? meta.generatedAt) })}</p> : null;
}
