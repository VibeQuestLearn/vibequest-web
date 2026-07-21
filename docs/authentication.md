# Google Authentication And Core Identity

## Trust Boundary

Google OAuth terminates in Next.js. Auth.js stores only the resulting account identity in an encrypted, HTTP-only session cookie. Google access and refresh tokens are never placed in the browser session returned to components and are never sent to Core.

For every protected Core call, the BFF reads the session, discards browser-supplied identity and authorization headers, and creates a 60-second HS256 assertion containing issuer, audience, opaque user ID, provider, Google `sub`, issue time, expiry, and a unique assertion ID. Core verifies the assertion and recomputes the opaque ID before resolving `AuthenticatedPrincipal`.

## Stable Identity

The user ID is `usr_` plus the first 32 base64url characters of `HMAC-SHA256(IDENTITY_DERIVATION_SECRET, "google:" + sub)`. Email is never an ownership key. Web and Core require the same independent 32-byte-or-longer derivation secret.

## Key Rotation

`CORE_ASSERTION_KEYS` is a comma-separated key ring. Web signs with the first entry; Core accepts every entry. Rotation order is:

1. Add the new key first in Web and anywhere in Core's accepted ring.
2. Deploy Core with both new and old keys.
3. Deploy Web with the new key first.
4. After the maximum 60-second assertion lifetime and deployment overlap, remove the old key.

Do not reuse `AUTH_SECRET`, `IDENTITY_DERIVATION_SECRET`, or an assertion key for another purpose.

## Threat Controls

| Threat | Control |
| --- | --- |
| OAuth request forgery | Google provider requires PKCE, state, and nonce checks. |
| CSRF | Auth.js uses same-site, HTTP-only cookies and CSRF validation for state-changing auth actions. |
| Open redirects | The redirect callback permits only relative or same-origin destinations. |
| Session theft | Production cookies are secure and HTTP-only; sessions expire after eight hours. |
| Session fixation | Auth.js issues the encrypted session after the validated callback; provider tokens are not reused as the app session. |
| Header impersonation | The BFF constructs a new header allowlist and never forwards browser authorization or identity headers. |
| Assertion forgery | Core verifies HS256 signature, key ID, issuer, audience, provider, subject derivation, issue time, expiry, and lifetime. |
| Assertion replay | Assertions expire after 60 seconds, are audience-bound, and Core consumes each unique assertion ID once in a bounded cache. |
| Account confusion | Only Google is enabled; provider plus stable `sub` is unique, while email and name remain mutable metadata. |
| Callback abuse | Auth endpoints are rate-limited per source and path; protected BFF traffic is rate-limited per opaque user and route. |

The in-process limiters provide deterministic single-instance protection. A multi-instance production deployment must enforce equivalent shared limits at the edge or gateway; this is a release-hardening requirement.

## Data Rights Foundation

`GET /api/core/v3/me/export` exports the authenticated user's v3 profile and owned records. `DELETE /api/core/v3/me` deletes the profile, learning sessions, submissions, and completion receipts selected only by the verified opaque user ID. No API accepts another user's ID for these operations.
