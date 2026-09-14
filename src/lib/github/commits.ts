import type { Octokit } from "octokit";
import type { CommitDetail, CommitSummary } from "@/types";
import { isMockMode } from "@/lib/config";
import { mockGetCommit, mockListCommits } from "@/lib/github/mock-data";

interface RawCommitListItem {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name?: string | null; date?: string | null } | null;
    committer: { name?: string | null; date?: string | null } | null;
  };
  author: { login: string } | null;
  parents: Array<{ sha: string }>;
}

function toCommitSummary(c: RawCommitListItem): CommitSummary {
  const message = c.commit.message ?? "";
  return {
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message,
    messageHeadline: message.split("\n")[0],
    authorName: c.commit.author?.name ?? "Unknown",
    authorLogin: c.author?.login ?? null,
    authorDate: c.commit.author?.date ?? "",
    committerName: c.commit.committer?.name ?? "Unknown",
    committerDate: c.commit.committer?.date ?? "",
    isMerge: c.parents.length > 1,
    parents: c.parents.map((p) => p.sha),
    htmlUrl: c.html_url,
  };
}

export interface ListCommitsOptions {
  branch?: string;
  since?: string;
  until?: string;
  author?: string;
  path?: string;
  page?: number;
  perPage?: number;
}

export interface ListCommitsResult {
  commits: CommitSummary[];
  hasNextPage: boolean;
}

/**
 * Lists commits for a branch with server-side pagination — the browser
 * never has to load an entire commit history at once.
 */
export async function listCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  options: ListCommitsOptions = {},
): Promise<ListCommitsResult> {
  const perPage = Math.min(options.perPage ?? 50, 100);
  const page = options.page ?? 1;

  if (isMockMode()) {
    const all = mockListCommits(owner, repo);
    const filtered = all.filter((c) => {
      if (options.since && new Date(c.authorDate) < new Date(options.since)) return false;
      if (options.until && new Date(c.authorDate) > new Date(options.until)) return false;
      if (options.author && !c.authorName.toLowerCase().includes(options.author.toLowerCase())) return false;
      return true;
    });
    const start = (page - 1) * perPage;
    return {
      commits: filtered.slice(start, start + perPage),
      hasNextPage: start + perPage < filtered.length,
    };
  }

  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: options.branch,
    since: options.since,
    until: options.until,
    author: options.author,
    path: options.path,
    per_page: perPage,
    page,
  });

  return {
    commits: (data as unknown as RawCommitListItem[]).map(toCommitSummary),
    hasNextPage: data.length === perPage,
  };
}

export async function getCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  sha: string,
): Promise<CommitDetail | null> {
  if (isMockMode()) return mockGetCommit(owner, repo, sha);

  try {
    const { data } = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
    const summary = toCommitSummary(data as unknown as RawCommitListItem);
    return {
      ...summary,
      filesChanged: data.files?.length ?? 0,
      additions: data.stats?.additions ?? 0,
      deletions: data.stats?.deletions ?? 0,
      files: (data.files ?? []).map((f) => ({
        filename: f.filename,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        status: f.status,
      })),
    };
  } catch (error) {
    const err = error as { status?: number };
    if (err.status === 404) return null;
    throw error;
  }
}

/**
 * GitHub does not expose an O(1) "total commit count" for a branch. The
 * most reliable approach without traversing full history is to read the
 * `Link: rel="last"` header from a 1-item-per-page request, which encodes
 * the final page number. When that isn't available (e.g. very small
 * histories), we fall back to counting the page directly. Results are
 * cached by the caller and labeled as an estimate where traversal was
 * capped.
 */
export async function estimateCommitCount(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch?: string,
): Promise<{ count: number; isEstimate: boolean }> {
  if (isMockMode()) {
    const all = mockListCommits(owner, repo);
    return { count: all.length, isEstimate: false };
  }

  const response = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha: branch,
    per_page: 1,
  });

  const link = response.headers.link;
  if (link) {
    const match = /page=(\d+)>; rel="last"/.exec(link);
    if (match) {
      return { count: parseInt(match[1], 10), isEstimate: false };
    }
  }
  return { count: response.data.length, isEstimate: false };
}
