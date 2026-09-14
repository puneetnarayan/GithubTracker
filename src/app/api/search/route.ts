import { withOctokit } from "@/lib/api-helpers";
import { listAccessibleRepos } from "@/lib/github/repos";
import { cached } from "@/lib/cache";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return withOctokit(request, async () => ({ groups: [] }));

  return withOctokit(request, async (octokit) => {
    const { value: repos } = await cached("repo-list", 5 * 60 * 1000, () => listAccessibleRepos(octokit));

    const matchingRepos = repos
      .filter((r) => r.fullName.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
      .slice(0, 8)
      .map((r) => ({
        id: r.fullName,
        title: r.fullName,
        subtitle: r.private ? "Private repository" : "Public repository",
        href: `/repositories/${r.owner}/${r.name}`,
      }));

    const branchMatches = repos
      .filter((r) => r.defaultBranch.toLowerCase().includes(q))
      .slice(0, 5)
      .map((r) => ({
        id: `${r.fullName}-branch`,
        title: r.defaultBranch,
        subtitle: `Default branch of ${r.fullName}`,
        href: `/branches?repo=${encodeURIComponent(r.fullName)}`,
      }));

    const groups = [
      matchingRepos.length > 0
        ? { type: "repositories", label: "Repositories", items: matchingRepos }
        : null,
      branchMatches.length > 0 ? { type: "branches", label: "Branches", items: branchMatches } : null,
    ].filter((g): g is NonNullable<typeof g> => g !== null);

    return { groups };
  });
}
