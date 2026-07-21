import "server-only";

type AssertionIdentity = {
  userId: string;
  providerSubject: string;
  email: string | null;
  name: string | null;
};

type SigningKey = {
  kid: string;
  bytes: ArrayBuffer;
};

const ASSERTION_TTL_SECONDS = 60;
const DEFAULT_ISSUER = "vibequest-web";
const DEFAULT_AUDIENCE = "vibequest-core";

export async function mintCoreAssertion(
  identity: AssertionIdentity,
): Promise<string> {
  const key = activeSigningKey();
  const now = Math.floor(Date.now() / 1_000);
  const issuer = process.env.CORE_ASSERTION_ISSUER || DEFAULT_ISSUER;
  const audience = process.env.CORE_ASSERTION_AUDIENCE || DEFAULT_AUDIENCE;
  const header = encodeJson({
    alg: "HS256",
    typ: "JWT",
    kid: key.kid,
  });
  const payload = encodeJson({
    iss: issuer,
    aud: audience,
    sub: identity.userId,
    provider: "google",
    provider_sub: identity.providerSubject,
    email: identity.email,
    name: identity.name,
    iat: now,
    exp: now + ASSERTION_TTL_SECONDS,
    jti: crypto.randomUUID(),
  });
  const input = `${header}.${payload}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.bytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(input),
  );

  return `${input}.${Buffer.from(signature).toString("base64url")}`;
}

export function assertionSigningConfigured(): boolean {
  try {
    activeSigningKey();
    return true;
  } catch {
    return false;
  }
}

function activeSigningKey(): SigningKey {
  const raw = process.env.CORE_ASSERTION_KEYS?.trim();
  if (!raw) {
    throw new Error("CORE_ASSERTION_KEYS is not configured.");
  }

  const entry = raw.split(",")[0]?.trim();
  const [kid, encoded] = entry?.split(":", 2) ?? [];
  if (
    !kid ||
    !/^[A-Za-z0-9._-]{1,64}$/.test(kid) ||
    !encoded ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  ) {
    throw new Error("CORE_ASSERTION_KEYS has an invalid active key.");
  }

  const decoded = Buffer.from(encoded, "base64url");
  if (decoded.byteLength < 32) {
    throw new Error("The active Core assertion key is too short.");
  }
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);

  return { kid, bytes: bytes.buffer };
}

function encodeJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
