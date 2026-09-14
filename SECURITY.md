# Security

This document describes the security architecture of GitHub Manager and
its known limitations. It follows the reusable Vercel security baseline
used to build and review this app.

## Architecture at a glance

```
Browser (untrusted)
   |
   |  same-origin fetch, cookie-based session
   v
Next.js Route Handlers (src/app/api/**)   <- the actual security boundary
   |
   |  server-only GitHub access token, read from the encrypted session JWT
   v
GitHub REST API (via octokit)
```

The frontend is treated as untrusted: every value it sends is re-validated
server-side, and no route trusts a client-supplied identity, owner/repo
name, branch, or SHA without checking it first.

## Authentication

- **Auth.js (NextAuth v5)** with the GitHub OAuth provider, session
  strategy `jwt`. Scopes requested: `read:user repo` — no admin, delete, or
  webhook scopes.
- The GitHub access token is stored only inside the encrypted session
  cookie. It is **never** copied onto the client-visible session object
  (`session()` callback in `src/lib/auth.ts` deliberately omits it), so it
  never reaches `/api/auth/session` or the browser.
- Server code reads the token directly off the request via
  `getServerAccessToken()`, using `next-auth/jwt`'s `getToken()` with an
  explicit `secureCookie` flag (forced from `NODE_ENV` rather than
  inferred from the request URL, which is unreliable behind Vercel's
  proxy).
- **Mock mode**: when `GITHUB_CLIENT_ID` is unset (or `MOCK_MODE=true`),
  the app serves synthetic demo data and skips authentication entirely.
  This is intentional and clearly indicated by a "DEMO DATA" badge in the
  UI; it must never be enabled in a deployment meant to show real data.
- **Owner-only access (optional)**: set `ALLOWED_GITHUB_USERNAMES` (a
  comma-separated allowlist) to restrict who may sign in at all. This is
  enforced in the `signIn` callback (`src/lib/auth.ts`) before a session
  is ever created, so a rejected account gets no session and cannot reach
  any page or API route — not just the UI's login button. Leaving it
  unset allows any GitHub account to sign in and use the app scoped to
  their own repositories.

## Authorization

Every route that reads or mutates GitHub data goes through `withOctokit()`
(`src/lib/api-helpers.ts`), which requires a valid session token before
doing anything — a 401 is returned otherwise. Routes that read
locally-stored data instead of calling GitHub (`/api/backups`,
`/api/audit`) go through the equivalent `requireAuthentication()` guard.
`/api/config` is the only route that is intentionally public — it exposes
a single non-secret boolean flag (`mockMode`) and nothing else.

This is a single-tenant, personal-account application: GitHub's own API
already scopes every response to what the signed-in user's token can see,
so there is no separate application-level "user A can't see user B's
repos" model to enforce beyond "does this request carry a valid GitHub
session."

## Input validation

All owner/repo/branch/SHA values are validated against strict regexes in
`src/lib/validation.ts` before use in any GitHub API call — this also
means no user-controlled string is ever concatenated into a shell command
(the one generated shell script, for the manual cleanup fallback, is
downloaded for the user to review and run themselves; the app never
executes it). Cleanup requests are validated with Zod schemas requiring
exact literal confirmations (`confirmText: "REWRITE HISTORY"`,
`acknowledgedPreview: true`, etc.) before anything happens.

## Destructive operations

The Cleanup wizard never performs a real history rewrite or force-push
itself — see the README's "History rewrite: what this app will and won't
do" section. Every destructive-adjacent action:
1. Requires authentication (server-verified, not just UI-hidden).
2. Requires a generated preview and safety analysis.
3. Requires typed confirmation plus three acknowledgement checkboxes.
4. Creates a real, verifiable backup ref on GitHub before generating
   anything.
5. Is recorded in the audit log — never with tokens or secrets, only
   repository/branch/SHA/user/result metadata.

## Data protection

- No secrets in source, `NEXT_PUBLIC_*` variables, logs, or error
  responses. API error messages are mapped to generic, user-safe text
  (`describeGitHubError` in `src/lib/github/client.ts`) — raw GitHub
  errors, stack traces, and internal details are never returned to the
  client.
- `.gitignore` excludes all `.env*` files except `.env.example`, which
  contains variable names only.

## Security headers

Configured globally in `next.config.ts`:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` restricting all fetches to same-origin plus
  `api.github.com` and GitHub's avatar CDN.

**Known limitation**: `script-src` and `style-src` include
`'unsafe-inline'`. Next.js App Router streams inline bootstrap scripts for
React Server Component payloads without a nonce by default; removing
`'unsafe-inline'` without wiring up per-request CSP nonces would break
hydration. Tightening this to a nonce-based policy is a valid follow-up,
not a blocking gap given the app has no user-generated-content rendering
path that would make inline-script injection likely.

## CSRF

State-changing API routes rely on the session cookie's `SameSite=Lax`
default (Auth.js's default), which blocks the cookie from being sent on
cross-site POST requests. There is no additional per-request CSRF token,
consistent with the auth framework's built-in protection being considered
sufficient for a same-origin app with no cross-site form-posting use case.

## Rate limiting

Not implemented. This is a personal-use, single-tenant app gated entirely
behind GitHub OAuth — the practical abuse surface is "an authenticated
user hits their own endpoints a lot," which GitHub's own API rate limits
already bound (surfaced in Settings). If this app is ever exposed to
multiple untrusted users, add rate limiting backed by a shared store
(e.g. Vercel KV/Upstash) before doing so — in-memory counters would not
work reliably across serverless instances.

## External integrations

GitHub is the only external integration. All calls go through
`src/lib/github/*`, use the authenticated user's own token, and are
read-only except the one real write this app performs: creating a backup
git ref (`src/lib/github/backup.ts`) before generating a cleanup plan.

## Persistence

Backup records and the audit log are stored in-memory
(`src/lib/store/memory-store.ts`), scoped to a single warm serverless
instance. This is a functional limitation (see README), not a security
one — no sensitive data is stored there beyond what's already described
above, and it holds no secrets.

## Known limitations / recommendations

- CSP's `'unsafe-inline'` for scripts/styles (see above) — nonce-based
  tightening is a valid future improvement.
- No rate limiting (see above) — add before multi-tenant exposure.
- In-memory backup/audit storage — replace with a real database before
  relying on those records long-term (functional, not a vulnerability).
