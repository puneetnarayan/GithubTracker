import type { Octokit } from "octokit";
import type { BranchInfo } from "@/types";
import { isMockMode } from "@/lib/config";
import { mockListBranches } from "@/lib/github/mock-data";

export async function listBranches(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<BranchInfo[]> {
  if (isMockMode()) return mockListBranches(owner, repo);

  const branches: BranchInfo[] = [];
  for (let page = 1; page <= 5; page++) {
    const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100, page });
    branches.push(
      ...data.map((b) => ({
        name: b.name,
        commitSha: b.commit.sha,
        protected: b.protected,
        isDefault: b.name === defaultBranch,
      })),
    );
    if (data.length < 100) break;
  }
  return branches;
}

export async function isBranchProtected(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<boolean> {
  if (isMockMode()) {
    const branches = mockListBranches(owner, repo);
    return branches.find((b) => b.name === branch)?.protected ?? false;
  }
  try {
    const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
    return data.protected;
  } catch {
    return false;
  }
}
