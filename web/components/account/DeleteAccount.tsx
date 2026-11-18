"use client";

// The danger zone: deleting the account, folded away at first, with a warning that it can't be undone, and after a
// second press: the database deletes the sign-in and with it every row of theirs
// (delete_account in supabase/migrations), then the session here is dropped.
import { useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, PART, SUBMIT } from "@/components/account/form";
import Disclosure from "@/components/ui/Disclosure";
import { useI18n } from "@/messages/client";

export default function DeleteAccount() {
  const { t } = useI18n();
  const { load } = useAccount();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    setBusy(true);
    const client = await load();
    const { error } = await client.rpc("delete_account");
    if (error) {
      setBusy(false);
      return setFailed(true);
    }
    await client.auth.signOut({ scope: "local" });
  };

  return (
    <div className={PART}>
      <h2 className="text-2xl mb-2">{t("account.danger.title")}</h2>
      <Disclosure summary={t("account.danger.open")}>
        <div className="mt-4 max-w-xl">
          {/* The warning, as the report and claim boxes: an outline, here in the site's red */}
          <div className="border border-red-700 bg-white p-4 mb-4">
            <p className="font-semibold text-red-700 mb-1">{t("account.danger.warning")}</p>
            <p className="text-gray-700">{t("account.danger.intro")}</p>
          </div>
          {!asking ? (
            <button type="button" onClick={() => setAsking(true)} className={SUBMIT}>{t("account.danger.delete")}</button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={busy} onClick={() => void remove()} className={`${SUBMIT} bg-black text-white`}>{t("account.danger.confirm")}</button>
              <button type="button" disabled={busy} onClick={() => setAsking(false)} className={SUBMIT}>{t("account.danger.cancel")}</button>
            </div>
          )}
          {failed && <p role="alert" className={ERROR}>{t("account.errors.unknown")}</p>}
        </div>
      </Disclosure>
    </div>
  );
}
