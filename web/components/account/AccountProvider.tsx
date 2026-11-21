"use client";

// The signed-in user, for every page's client parts (the header's account button, follow stars, the front page's
// cards): the session, the profile, and what they follow, read once and kept here. Mounted by the site's
// layout around the page, which stays server-rendered and the same for everyone.
//
// The Supabase code is loaded only for a visitor who has signed in on this device (a session in localStorage), or when
// the sign-in page asks for it (load()): the rest, nearly every visit and every crawler, never downloads it.
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ACCOUNTS, type FollowKind, type Profile, STORAGE_KEY } from "@/utils/account";

/** off: no accounts on this site; loading: a session is being read; noProfile: signed in, the age gate not yet passed */
export type AccountStatus = "off" | "loading" | "signedOut" | "noProfile" | "ready";

interface Account {
  status: AccountStatus;
  email: string | null;
  /** When the sign-in was made (the account's age, for suggestions and reports) */
  createdAt: string | null;
  profile: Profile | null;
  /** "player:123", "club:<slug>" */
  follows: ReadonlySet<string>;
  /** The Supabase client, loading it first if this page hasn't */
  load: () => Promise<SupabaseClient>;
  setProfile: (profile: Profile) => void;
  toggleFollow: (kind: FollowKind, target: string | number) => Promise<void>;
  signOut: () => Promise<void>;
}

const EMPTY = new Set<never>();
const AccountContext = createContext<Account | null>(null);

let clientPromise: Promise<SupabaseClient> | null = null;
const loadClient = () => (clientPromise ??= import("@/utils/supabase").then((m) => m.getSupabase()));

/**
 * Whether this browser has a session (signed in here, or in another tab: the storage event), or is coming back from
 * Google's sign-in with one to make: a `code` in the address and the verifier signInWithOAuth left (PKCE). Supabase,
 * once loaded, swaps the code for the session and takes it out of the address.
 */
const hasStoredSession = () => {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return true;
    return new URLSearchParams(window.location.search).has("code") && localStorage.getItem(`${STORAGE_KEY}-code-verifier`) !== null;
  } catch {
    return false;
  }
};
const subscribeStorage = (onChange: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

export function AccountProvider({ children }: { children: ReactNode }) {
  // The state once Supabase has answered (null before); until then, by whether there's a session here at all (null on
  // the server and while hydrating: "loading", the same on both)
  const [answered, setStatus] = useState<AccountStatus | null>(null);
  const stored = useSyncExternalStore(subscribeStorage, hasStoredSession, () => null);
  const status: AccountStatus = !ACCOUNTS ? "off" : (answered ?? (stored === false ? "signedOut" : "loading"));
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [follows, setFollows] = useState<ReadonlySet<string>>(EMPTY);
  const listening = useRef(false);

  const readAccount = useCallback(async (client: SupabaseClient, current: Session | null) => {
    setSession(current);
    if (!current) {
      setProfile(null);
      setFollows(EMPTY);
      setStatus("signedOut");
      return;
    }
    const [p, f] = await Promise.all([client.from("profiles").select("*").maybeSingle<Profile>(), client.from("follows").select("kind, target")]);
    setProfile(p.data ?? null);
    setFollows(new Set((f.data ?? []).map((row: { kind: string; target: string }) => `${row.kind}:${row.target}`)));
    setStatus(p.data ? "ready" : "noProfile");
  }, []);

  const load = useCallback(async () => {
    const client = await loadClient();
    if (!listening.current) {
      listening.current = true;
      // Called at once with the stored session (INITIAL_SESSION), then on every sign-in, sign-out and refresh. Its
      // work is deferred: a Supabase call made inside the callback itself would wait for the callback to finish.
      client.auth.onAuthStateChange((event, current) => {
        if (event === "TOKEN_REFRESHED") return setSession(current);
        setTimeout(() => void readAccount(client, current), 0);
      });
    }
    return client;
  }, [readAccount]);

  // A session here (or one just made in another tab): Supabase loaded, and the account read
  useEffect(() => {
    if (ACCOUNTS && stored) void load();
  }, [stored, load]);

  const toggleFollow = useCallback(
    async (kind: FollowKind, target: string | number) => {
      if (!session) return;
      const key = `${kind}:${target}`;
      const following = follows.has(key);
      const next = (on: boolean) =>
        setFollows((old) => {
          const set = new Set(old);
          if (on) set.add(key);
          else set.delete(key);
          return set;
        });
      next(!following);
      const client = await load();
      const { error } = following
        ? await client.from("follows").delete().match({ kind, target: String(target) })
        : await client.from("follows").insert({ user_id: session.user.id, kind, target: String(target) });
      if (error) next(following);
    },
    [follows, load, session],
  );

  const signOut = useCallback(async () => {
    const client = await load();
    await client.auth.signOut();
  }, [load]);

  const value = useMemo<Account>(
    () => ({
      status,
      email: session?.user.email ?? null,
      createdAt: session?.user.created_at ?? null,
      profile,
      follows,
      load,
      setProfile: (p) => {
        setProfile(p);
        setStatus("ready");
      },
      toggleFollow,
      signOut,
    }),
    [status, session, profile, follows, load, toggleFollow, signOut],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

/** The signed-in user (or the state of signing in), in a client component under the site's layout */
export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error("useAccount() outside AccountProvider");
  return account;
}
