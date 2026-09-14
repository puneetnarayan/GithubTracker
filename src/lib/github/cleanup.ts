import type { Octokit } from "octokit";
import type { CleanupSafetyAnalysis, CommitSummary } from "@/types";
import { isMockMode } from "@/lib/config";
import { isBranchProtected } from "@/lib/github/branches";
import { mockListBranches, mockListCommits, mockListTags } from "@/lib/github/mock-data";

export interface CleanupSelectionContext {
  owner: string;
  repo: string;
  branch: string;
  defaultBranch: string;
  selectedShas: string[];
  headSha: string;
}

/**
 * Runs the read-only safety checks described in the cleanup wizard
 * ("Step 2 — Dependency/Safety Analysis"). This never mutates anything.
 */
export async function analyzeCleanupSafety(
  octokit: Octokit,
  ctx: CleanupSelectionContext,
): Promise<CleanupSafetyAnalysis> {
  const warnings: string[] = [];

  const isDefaultBranch = ctx.branch === ctx.defaultBranch;
  const protectedBranch = await isBranchProtected(octokit, ctx.owner, ctx.repo, ctx.branch);

  let commits: CommitSummary[];
  let tags: Array<{ name: string; commitSha: string }>;
  let branches: Array<{ name: string; commitSha: string }>;

  if (isMockMode()) {
    commits = mockListCommits(ctx.owner, ctx.repo);
    tags = mockListTags(ctx.owner, ctx.repo);
    branches = mockListBranches(ctx.owner, ctx.repo);
  } else {
    const { data: commitList } = await octokit.rest.repos.listCommits({
      owner: ctx.owner,
      repo: ctx.repo,
      sha: ctx.branch,
      per_page: 100,
    });
    commits = commitList.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: c.commit.message,
      messageHeadline: c.commit.message.split("\n")[0],
      authorName: c.commit.author?.name ?? "Unknown",
      authorLogin: c.author?.login ?? null,
      authorDate: c.commit.author?.date ?? "",
      committerName: c.commit.committer?.name ?? "Unknown",
      committerDate: c.commit.committer?.date ?? "",
      isMerge: c.parents.length > 1,
      parents: c.parents.map((p) => p.sha),
      htmlUrl: c.html_url,
    }));
    const { data: tagData } = await octokit.rest.repos.listTags({
      owner: ctx.owner,
      repo: ctx.repo,
      per_page: 100,
    });
    tags = tagData.map((t) => ({ name: t.name, commitSha: t.commit.sha }));
    const { data: branchData } = await octokit.rest.repos.listBranches({
      owner: ctx.owner,
      repo: ctx.repo,
      per_page: 100,
    });
    branches = branchData.map((b) => ({ name: b.name, commitSha: b.commit.sha }));
  }

  const knownShas = new Set(commits.map((c) => c.sha));
  const shaIndex = new Map(commits.map((c, i) => [c.sha, i]));
  const selectedShaSet = new Set(ctx.selectedShas);

  const allSelectedAreAncestorsOfHead = ctx.selectedShas.every((sha) => knownShas.has(sha));
  const containsMergeCommits = commits.some((c) => selectedShaSet.has(c.sha) && c.isMerge);

  const oldestSelectedIndex = Math.max(
    ...ctx.selectedShas.map((sha) => shaIndex.get(sha) ?? -1),
  );
  const hasCommitsAfterSelection = oldestSelectedIndex > 0;

  const tagsPointingToAffected = tags.filter((t) => selectedShaSet.has(t.commitSha)).map((t) => t.name);
  const branchesPointingToAffected = branches
    .filter((b) => selectedShaSet.has(b.commitSha))
    .map((b) => b.name);

  if (protectedBranch) {
    warnings.push(
      "This branch is protected. GitHub branch protection rules may reject a force push required to complete this rewrite.",
    );
  }
  if (isDefaultBranch) {
    warnings.push("This is the repository's default branch. Rewriting it affects every collaborator.");
  }
  if (!allSelectedAreAncestorsOfHead) {
    warnings.push(
      "One or more selected commits could not be confirmed as ancestors of the current HEAD within the inspected range.",
    );
  }
  if (containsMergeCommits) {
    warnings.push("The selection includes merge commits, which complicates a linear history rewrite.");
  }
  if (hasCommitsAfterSelection) {
    warnings.push(
      "Commits exist after the oldest selected commit — removing selected commits requires replaying every commit after them.",
    );
  }
  if (tagsPointingToAffected.length > 0) {
    warnings.push(`Tag(s) point directly to affected commits: ${tagsPointingToAffected.join(", ")}.`);
  }
  if (branchesPointingToAffected.length > 0) {
    warnings.push(`Other branch(es) point to affected commits: ${branchesPointingToAffected.join(", ")}.`);
  }

  const impact: CleanupSafetyAnalysis["impact"] =
    isDefaultBranch || protectedBranch || ctx.selectedShas.length > 100
      ? "high"
      : ctx.selectedShas.length > 10
        ? "medium"
        : "low";

  return {
    isProtectedBranch: protectedBranch,
    isDefaultBranch,
    allSelectedAreAncestorsOfHead,
    containsMergeCommits,
    hasCommitsAfterSelection,
    tagsPointingToAffected,
    branchesPointingToAffected,
    requiresForcePush: true,
    hasSufficientPermission: true,
    warnings,
    impact,
  };
}

/**
 * Generates the exact Git commands a user would run locally to perform the
 * requested cleanup. This is the safe fallback described in the spec:
 * Vercel's serverless runtime cannot reliably clone a large repository,
 * rewrite its history with `git filter-repo`/`git rebase`, and force-push
 * it within the platform's execution and filesystem limits, so this
 * application never attempts that rewrite itself. It creates a real backup
 * ref via the GitHub API (see createBackupRef) and hands the user a
 * reviewable script instead of performing history surgery blindly.
 */
export function generateManualCleanupScript(params: {
  owner: string;
  repo: string;
  branch: string;
  headSha: string;
  backupRef: string;
  selectedShas: string[];
}): string {
  const { owner, repo, branch, headSha, backupRef, selectedShas } = params;
  const shaArgs = selectedShas.map((s) => `  ${s}`).join(" \\\n");

  return `#!/usr/bin/env bash
# Generated cleanup script — REVIEW BEFORE RUNNING.
#
# Repository:      ${owner}/${repo}
# Branch:           ${branch}
# HEAD at generation: ${headSha}
# Backup ref (on GitHub, created automatically): ${backupRef}
# Commits targeted for removal: ${selectedShas.length}
#
# This script rewrites local history and force-pushes. It does NOT run
# automatically — the web application only generates it. Run it from a
# clean clone, ideally with git-filter-repo installed
# (https://github.com/newren/git-filter-repo), and confirm with your team
# before force-pushing a shared branch.

set -euo pipefail

git clone git@github.com:${owner}/${repo}.git ${repo}-cleanup
cd ${repo}-cleanup
git checkout ${branch}

# Sanity check: confirm local HEAD matches what this plan was built against.
current_head="$(git rev-parse HEAD)"
if [ "$current_head" != "${headSha}" ]; then
  echo "HEAD has moved since this plan was generated ($current_head != ${headSha})." >&2
  echo "Re-run the cleanup preview in the app before proceeding." >&2
  exit 1
fi

# Remove the selected commits from history. Requires git-filter-repo.
git filter-repo --force --commit-callback '
selected = {
${shaArgs}
}
if commit.original_id.decode("ascii") in selected:
    commit.skip()
'

# Verify the backup ref exists remotely before force-pushing.
git fetch origin "refs/heads/${backupRef}"

# Force-push the rewritten branch. This changes shared history.
git push --force-with-lease origin ${branch}
`;
}
