import type { Octokit } from "octokit";
import type { ReleaseInfo, TagInfo } from "@/types";
import { isMockMode } from "@/lib/config";
import { mockListReleases, mockListTags } from "@/lib/github/mock-data";

export async function listTags(octokit: Octokit, owner: string, repo: string): Promise<TagInfo[]> {
  if (isMockMode()) return mockListTags(owner, repo);
  const { data } = await octokit.rest.repos.listTags({ owner, repo, per_page: 100 });
  return data.map((t) => ({
    name: t.name,
    commitSha: t.commit.sha,
    type: "lightweight" as const,
  }));
}

export async function listReleases(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<ReleaseInfo[]> {
  if (isMockMode()) return mockListReleases(owner, repo);
  const { data } = await octokit.rest.repos.listReleases({ owner, repo, per_page: 100 });
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    tagName: r.tag_name,
    publishedAt: r.published_at,
    draft: r.draft,
    prerelease: r.prerelease,
    htmlUrl: r.html_url,
  }));
}
