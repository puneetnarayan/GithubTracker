import { withOctokit } from "@/lib/api-helpers";
import { listAccessibleRepos } from "@/lib/github/repos";
import { listCommits } from "@/lib/github/commits";
import { cached, mapWithConcurrency } from "@/lib/cache";
import type { CommitSummary } from "@/types";

const WINDOWS = [7, 30, 90] as const;

/**
 * Aggregated activity summary used by the Dashboard and Activity pages.
 *
 * To avoid pulling entire commit histories just to draw a chart, this only
 * looks at each repository's most recent 100 commits on its default
 * branch. Repositories with more history than that will under-count
 * long-window totals — the response marks such repos explicitly so the UI
 * can label affected numbers as partial rather than presenting them as
 * exact.
 */
export async function GET(request: Request) {
  return withOctokit(request, async (octokit) => {
    const { value: repos } = await cached("repo-list", 5 * 60 * 1000, () => listAccessibleRepos(octokit));

    const perRepo = await mapWithConcurrency(repos, 4, async (repo) => {
      const { value } = await cached(`activity:${repo.fullName}`, 5 * 60 * 1000, async () => {
        const { commits, hasNextPage } = await listCommits(octokit, repo.owner, repo.name, {
          branch: repo.defaultBranch,
          perPage: 100,
        });
        return { commits, truncated: hasNextPage };
      });
      return { repo: repo.fullName, ...value };
    });

    const now = Date.now();
    const authorTotals = new Map<string, number>();
    const repoTotals: Array<{ repo: string; d7: number; d30: number; d90: number; total: number; truncated: boolean }> =
      [];

    for (const entry of perRepo) {
      const counts = { d7: 0, d30: 0, d90: 0 };
      for (const commit of entry.commits as CommitSummary[]) {
        const ageDays = (now - new Date(commit.authorDate).getTime()) / 86400000;
        for (const w of WINDOWS) {
          if (ageDays <= w) counts[`d${w}` as "d7" | "d30" | "d90"] += 1;
        }
        authorTotals.set(commit.authorName, (authorTotals.get(commit.authorName) ?? 0) + 1);
      }
      repoTotals.push({
        repo: entry.repo,
        d7: counts.d7,
        d30: counts.d30,
        d90: counts.d90,
        total: entry.commits.length,
        truncated: entry.truncated,
      });
    }

    const mostActiveRepo = [...repoTotals].sort((a, b) => b.d30 - a.d30)[0] ?? null;
    const mostActiveAuthor =
      [...authorTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      repoActivity: repoTotals,
      authorActivity: Array.from(authorTotals.entries()).map(([author, count]) => ({ author, count })),
      mostActiveRepo: mostActiveRepo?.repo ?? null,
      mostActiveAuthor,
      isPartial: perRepo.some((e) => e.truncated),
    };
  });
}
