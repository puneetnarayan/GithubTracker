import type { Octokit } from "octokit";
import type { RepoSummary } from "@/types";
import { isMockMode } from "@/lib/config";
import { mockGetRepo, mockListRepos } from "@/lib/github/mock-data";

function toRepoSummary(r: {
  id: number;
  name: string;
  owner: { login: string };
  full_name: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  default_branch: string;
  size: number;
  html_url: string;
  description: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  open_issues_count: number;
  language: string | null;
}): RepoSummary {
  return {
    id: r.id,
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    archived: r.archived,
    fork: r.fork,
    defaultBranch: r.default_branch,
    sizeKb: r.size,
    htmlUrl: r.html_url,
    description: r.description,
    updatedAt: r.updated_at ?? "",
    pushedAt: r.pushed_at ?? "",
    openIssuesCount: r.open_issues_count,
    language: r.language,
  };
}

/**
 * Lists repositories accessible to the authenticated user.
 *
 * Uses GitHub's paginated `/user/repos` endpoint with a bounded number of
 * pages so a single dashboard load cannot balloon into thousands of
 * requests against a very large account.
 */
export async function listAccessibleRepos(octokit: Octokit): Promise<RepoSummary[]> {
  if (isMockMode()) return mockListRepos();

  const MAX_PAGES = 10; // up to 1000 repositories per_page=100
  const results: RepoSummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: "updated",
      affiliation: "owner,collaborator,organization_member",
    });
    results.push(...data.map(toRepoSummary));
    if (data.length < 100) break;
  }
  return results;
}

export async function getRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<RepoSummary | null> {
  if (isMockMode()) return mockGetRepo(owner, repo);
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return toRepoSummary(data);
}
