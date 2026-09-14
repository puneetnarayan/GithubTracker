# GitHub Manager

A dashboard for browsing, sizing, and auditing GitHub repositories and their
commit history — with a deliberately safe, reviewable workflow for Git
history cleanup instead of a fake "delete commit" button.

## What it does

- Lists all repositories accessible to your GitHub account with size,
  commit/branch/tag counts, and update recency.
- Repository detail pages with commits, branches, tags, releases, storage,
  and cleanup tabs.
- A commit browser with rich filtering (date, author, message, SHA, files
  changed, additions/deletions, merge vs. normal) and multi-selection that
  is scoped to one repository + branch at a time.
- A storage-analysis view and a large-file heuristic scan (current tree
  only — GitHub's API has no cheap way to scan full history for large
  blobs).
- An **honest** history-cleanup wizard: it never claims to delete a commit.
  On explicit, multi-step confirmation it creates a real backup Git ref on
  GitHub and generates an exact, reviewable shell script for you to run
  locally — it never runs a rewrite or force-push itself (see
  [Known limitations](#known-vercel-runtime-limitations) below).
- A backup registry and audit log of every cleanup attempt.
- Activity, rate-limit, and dark-mode support, plus a mock/demo mode that
  needs no GitHub connection at all.

## Architecture

- **Next.js 16 (App Router)**, TypeScript strict mode, Tailwind CSS v4.
- **Auth.js (NextAuth v5)** with the GitHub OAuth provider. The access
  token lives only inside the encrypted session JWT cookie; it is never
  attached to the client-visible session object, never logged, and never
  sent to the browser. Server code reads it directly off the request via
  `getServerAccessToken()` (`src/lib/auth.ts`).
- **API routes** (`src/app/api/**`) are the only place that talk to
  GitHub. Every route validates its inputs (owner/repo/branch/SHA regexes
  in `src/lib/validation.ts`) before doing anything with them — no
  request ever forwards a raw client value into a shell command.
- **`octokit`** for GitHub REST calls, wrapped in `src/lib/github/*` so
  each concern (repos, commits, branches, tags/releases, rate limit,
  large-file heuristics, cleanup safety analysis) has its own module.
- **Mock mode** (`src/lib/github/mock-data.ts`) generates a deterministic
  set of ~12 repositories with hundreds of commits, branches, tags,
  releases, and flagged large files, so the UI can be developed and demoed
  without any GitHub credentials.
- **Caching** (`src/lib/cache.ts`) is an in-memory, per-instance TTL cache
  used to avoid re-fetching repo lists/branches/tags on every request, plus
  a bounded-concurrency helper so dashboard loads can't fan out into
  hundreds of simultaneous GitHub calls.
- **Persistence** (`src/lib/store/*`) is a small `PersistenceAdapter`
  interface with an in-memory default implementation, used only for backup
  records and the audit log. See the in-code limitation note before
  relying on it in production.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without `GITHUB_CLIENT_ID` set, the app automatically runs in **mock
mode** — open http://localhost:3000 and you'll see a `DEMO DATA` badge and
a full set of synthetic repositories/commits/etc. No GitHub account or
network access is required.

## Connecting a real GitHub account

1. Create a GitHub OAuth App at
   https://github.com/settings/developers → "New OAuth App".
   - Homepage URL: your deployment URL (or `http://localhost:3000` locally).
   - Authorization callback URL: `<url>/api/auth/callback/github`.
2. Copy the Client ID and generate a Client Secret.
3. Set the environment variables below and restart the app.

### Required environment variables

| Variable | Purpose |
|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret. Never expose this to the browser. |
| `NEXTAUTH_SECRET` | Random 32+ byte secret used to encrypt the session cookie. Generate with `openssl rand -base64 32`. |
| `MOCK_MODE` | Optional. `true` forces demo data even with credentials set; `false` forces a live connection. Leave unset to auto-detect. |

None of these are `NEXT_PUBLIC_*` — they never reach client JavaScript.

### GitHub permissions required

The OAuth flow requests exactly two scopes: `read:user` (profile display)
and `repo` (read access to public and private repository metadata,
commits, branches, tags, releases, and the Git Data API used only to
create a backup ref — never to delete or force-push anything). No
`admin:*`, `delete_repo`, or webhook scopes are requested.

## Running mock mode explicitly

```bash
MOCK_MODE=true npm run dev
```

## Vercel deployment

1. Push this repository to GitHub.
2. Import it in Vercel.
3. Add the environment variables from the table above in the Vercel
   project settings (Production + Preview as needed).
4. Deploy. The app has no build-time dependency on a database or a
   long-running process, so it works on the Vercel Hobby plan.

## Security considerations

- Access tokens never touch `localStorage`, client-side source, URLs, or
  server logs.
- All owner/repo/branch/SHA values are validated against strict regexes
  server-side before use (`src/lib/validation.ts`) — no user-controlled
  string is ever interpolated into a shell command executed by this app.
  The one generated shell script (the manual cleanup plan) is downloaded
  for the user to read and run themselves; the app never executes it.
- Every destructive-adjacent action requires a signed-in session; API
  routes re-derive the GitHub identity server-side rather than trusting
  anything the client sends about who the user is.

## History rewrite: what this app will and won't do

GitHub has no API that deletes an arbitrary historical commit. Removing
one means rewriting every commit after it and force-pushing the result.
The Cleanup wizard (`/cleanup`) always:

1. Requires a generated preview and a safety analysis (protected/default
   branch, merge commits, tags/branches pointing at affected commits).
2. Requires three separate acknowledgement checkboxes plus typing
   `REWRITE HISTORY` before anything happens.
3. On confirmation, creates a **real** backup Git ref on GitHub (via the
   Git Data API — verifiable in the Backups page and directly on GitHub)
   pointing at the pre-cleanup HEAD.
4. Generates an exact, human-reviewable shell script naming the
   repository, branch, original HEAD, backup ref, and target commits.

It never performs the rewrite or force-push itself, and never reports
"Deleted successfully" — the execute endpoint's result is always
`plan-generated`, not `success`, because no remote history was changed by
that call.

### Known Vercel runtime limitations

Rewriting history for real requires cloning the repository, running Git
tooling (e.g. `git-filter-repo`), and force-pushing — all within a large,
unbounded amount of time and disk. Vercel serverless functions have hard
execution-time and ephemeral-filesystem limits and no guarantee that `git`
or `git-filter-repo` binaries are even available in the runtime image.
Rather than attempt that and risk a partial, unverifiable rewrite, this
app treats the generated script + real backup ref as the safe fallback
described in its spec, and asks the user to run the rewrite themselves
from a normal machine.

### Known GitHub API limitations

- There is no O(1) "total commit count" endpoint; the app reads the
  `Link: rel="last"` pagination header from a 1-per-page request as a
  reasonably cheap approximation, and labels it as an estimate in the UI
  when that isn't available.
- Git LFS usage and Actions artifact/cache storage are not exposed by the
  repository metadata endpoint this app uses, so the Storage page
  deliberately does not present a single combined "quota" number — only
  repository size, which GitHub does report directly.
- Large-file analysis inspects the current default-branch tree via the Git
  Trees API; it cannot report the largest file ever committed without a
  full clone, so it's labeled as a current-state heuristic, not a history
  audit.

## Persistence limitation

Backup records and the audit log are currently kept in an in-memory store
scoped to one warm serverless instance (see `src/lib/store/memory-store.ts`).
That's sufficient for demoing and for a single long-lived server process,
but Vercel recycles instances and does not share memory across them or
across regions. Before relying on these records in a real production
deployment, replace `memory-store.ts` with an implementation of the same
`PersistenceAdapter` interface backed by a real database (Postgres, Vercel
KV/Redis, etc.) — no other code needs to change.
