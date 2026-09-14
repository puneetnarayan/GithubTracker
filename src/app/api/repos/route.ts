import { withOctokit } from "@/lib/api-helpers";
import { listAccessibleRepos } from "@/lib/github/repos";
import { listBranches } from "@/lib/github/branches";
import { listTags } from "@/lib/github/tags-releases";
import { estimateCommitCount } from "@/lib/github/commits";
import { cached, mapWithConcurrency } from "@/lib/cache";
import { isMockMode } from "@/lib/config";
import type { Octokit } from "octokit";
import type { RepoSummary } from "@/types";

const REPO_LIST_TTL_MS = 5 * 60 * 1000;
const ENRICHMENT_TTL_MS = 10 * 60 * 1000;

async function enrichRepo(octokit: Octokit, repo: RepoSummary): Promise<RepoSummary> {
  if (isMockMode()) return repo;

  const { value } = await cached(`repo-enrich:${repo.fullName}`, ENRICHMENT_TTL_MS, async () => {
    const [commitInfo, branches, tags] = await Promise.all([
      estimateCommitCount(octokit, repo.owner, repo.name, repo.defaultBranch),
      listBranches(octokit, repo.owner, repo.name, repo.defaultBranch),
      listTags(octokit, repo.owner, repo.name),
    ]);
    return {
      commitCount: commitInfo.count,
      commitCountIsEstimate: commitInfo.isEstimate,
      branchCount: branches.length,
      tagCount: tags.length,
    };
  });

  return { ...repo, ...value };
}

export async function GET(request: Request) {
  return withOctokit(request, async (octokit) => {
    const { value: repos, fetchedAt } = await cached("repo-list", REPO_LIST_TTL_MS, () =>
      listAccessibleRepos(octokit),
    );

    // Enrichment (commit/branch/tag counts) is fetched with bounded
    // concurrency and cached separately so a single dashboard load can't
    // fan out into hundreds of simultaneous GitHub requests.
    const enriched = await mapWithConcurrency(repos, 4, (repo) => enrichRepo(octokit, repo));

    return { repos: enriched, lastRefreshed: new Date(fetchedAt).toISOString() };
  });
}

export async function POST(request: Request) {
  // Manual "Refresh" action: bypasses the cache for the repo list itself.
  const { invalidateCache } = await import("@/lib/cache");
  invalidateCache("repo-list");
  invalidateCache("repo-enrich:");
  return withOctokit(request, async (octokit) => {
    const repos = await listAccessibleRepos(octokit);
    const enriched = await mapWithConcurrency(repos, 4, (repo) => enrichRepo(octokit, repo));
    return { repos: enriched, lastRefreshed: new Date().toISOString() };
  });
}

