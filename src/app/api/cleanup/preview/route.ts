import { NextResponse } from "next/server";
import { withOctokit } from "@/lib/api-helpers";
import { cleanupRequestSchema, ValidationError } from "@/lib/validation";
import { getRepo } from "@/lib/github/repos";
import { analyzeCleanupSafety } from "@/lib/github/cleanup";
import { listCommits } from "@/lib/github/commits";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = cleanupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cleanup request" }, { status: 400 });
  }
  const { owner, repo, branch, selectedShas } = parsed.data;

  return withOctokit(request, async (octokit) => {
    const repoData = await getRepo(octokit, owner, repo);
    if (!repoData) throw Object.assign(new Error("Repository not found"), { status: 404 });

    const { commits } = await listCommits(octokit, owner, repo, { branch, perPage: 100 });
    const headSha = repoData.lastCommitSha ?? commits[0]?.sha ?? "";

    const selectedSet = new Set(selectedShas);
    const selectedCommits = commits.filter((c) => selectedSet.has(c.sha));
    const oldest = selectedCommits[selectedCommits.length - 1] ?? null;
    const newest = selectedCommits[0] ?? null;

    if (selectedCommits.length !== selectedShas.length) {
      throw new ValidationError(
        "One or more selected commits could not be found in the requested branch's recent history. Refresh the commit list and try again.",
      );
    }

    const safety = await analyzeCleanupSafety(octokit, {
      owner,
      repo,
      branch,
      defaultBranch: repoData.defaultBranch,
      selectedShas,
      headSha,
    });

    return {
      repository: repoData.fullName,
      branch,
      headSha,
      selectedCount: selectedShas.length,
      remainingCount: Math.max(0, (repoData.commitCount ?? commits.length) - selectedShas.length),
      oldestSelected: oldest,
      newestSelected: newest,
      safety,
    };
  });
}
