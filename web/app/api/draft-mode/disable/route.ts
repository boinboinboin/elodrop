// Turns draft mode off again (app/api/draft-mode/enable), back to the published pages: the Studio's preview has a
// button for it, and /api/draft-mode/disable can be opened by hand. ?to=/about goes back to that page.
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  (await draftMode()).disable();
  const to = new URL(request.url).searchParams.get("to");
  // Only a path on this site
  redirect(to && /^\/(?!\/)/.test(to) ? to : "/");
}
