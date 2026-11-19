// Sending one Web Push message, with nothing but Web Crypto (Deno and Node alike): the payload encrypted for the
// browser's subscription (RFC 8291, aes128gcm), and the request signed with the site's VAPID key (RFC 8292), which the
// push services (Apple, Google, Mozilla) check.

export interface Subscription {
  endpoint: string;
  /** The browser's public key (P-256, uncompressed, base64url) and auth secret (base64url) */
  p256dh: string;
  auth: string;
}
export interface Vapid {
  /** The site's key pair: public (uncompressed point, base64url) and private (the scalar d, base64url) */
  publicKey: string;
  privateKey: string;
  /** A contact for the push services: "mailto:…" */
  subject: string;
}

const enc = new TextEncoder();

export const fromBase64Url = (s: string): Uint8Array => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};
export const toBase64Url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** The payload encrypted for the subscription (aes128gcm, one record) */
export async function encrypt(payload: Uint8Array, sub: Subscription): Promise<Uint8Array> {
  const uaPublic = fromBase64Url(sub.p256dh);
  const authSecret = fromBase64Url(sub.auth);
  // A key pair for this message alone
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // The payload and the last record's delimiter (2), no padding
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));
  // The header: salt, record size (4096), the key's length and the key
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, sealed);
}

/** The VAPID Authorization header for an endpoint's push service (a JWT valid 12 hours, signed ES256) */
export async function vapidAuthorization(endpoint: string, vapid: Vapid): Promise<string> {
  const pub = fromBase64Url(vapid.publicKey);
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", d: vapid.privateKey, x: toBase64Url(pub.slice(1, 33)), y: toBase64Url(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = toBase64Url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = toBase64Url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject })));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${toBase64Url(signature)}, k=${vapid.publicKey}`;
}

/** Send one message: the push service's status (201 sent; 404 and 410 mean the subscription is gone) */
export async function sendPush(sub: Subscription, message: unknown, vapid: Vapid, ttlSeconds = 24 * 3600): Promise<number> {
  const body = await encrypt(enc.encode(JSON.stringify(message)), sub);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, vapid),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "normal",
    },
    body,
  });
  await res.body?.cancel();
  return res.status;
}
