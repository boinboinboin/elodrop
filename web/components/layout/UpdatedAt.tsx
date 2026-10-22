import { getMeta } from "@/data/meta";
import { t } from "@/messages/i18n";
import { dateTime } from "@/utils/format";

/** When the pipeline last finished fetching, rating and building the site's data, in Norwegian time */
export default async function UpdatedAt() {
  const meta = await getMeta();
  return meta ? <p>{t("layout.footer.updated", { time: dateTime(meta.updatedAt ?? meta.generatedAt) })}</p> : null;
}
