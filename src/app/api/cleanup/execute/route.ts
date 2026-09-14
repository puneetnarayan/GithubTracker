import { NextResponse } from "next/server";
import { z } from "zod";
import { withOctokit, getCurrentUserLabel } from "@/lib/api-helpers";
import { cleanupRequestSchema, ValidationError } from "@/lib/validation";
import { getRepo } from "@/lib/github/repos";
import { analyzeCleanupSafety, generateManualCleanupScript } from "@/lib/github/cleanup";
import { backupRefName, createBackupRef } from "@/lib/github/backup";
import { store } from "@/lib/store/memory-store";
import type { AuditLogEntry, BackupRecord } from "@/types";

const executeSchema = cleanupRequestSchema.extend({
  confirmText: z.literal("REWRITE HISTORY"),
  acknowledgedPreview: z.literal(true),
  acknowledgedBackup: z.literal(true),
  acknowledgedHistoryChange: z.literal(true),
});

/**
 * This endpoint deliberately never rewrites Git history itself.
 *
 * GitHub's REST/GraphQL APIs have no operation that removes an arbitrary
 * historical commit from a branch — that requires rewriting every commit
 * after it and force-pushing the result, which in turn requires cloning
 * the repository and running real Git tooling (e.g. git-filter-repo).
 * Vercel's serverless functions cannot reliably do that within their
 * execution-time and filesystem limits, and this app never fakes success.
 *
 * Instead, on explicit confirmation, it:
 *   1. Creates a real backup ref on GitHub pointing at the current HEAD.
 *   2. Generates the exact, reviewable Git commands to run locally.
 *   3. Records an audit log entry and backup record — result is always
 *      "plan-generated", never "success", because no remote history was
 *      changed by this call.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing required confirmations. Complete every step of the cleanup wizard before submitting." },
      { status: 400 },
    );
  }
  const { owner, repo, branch, selectedShas } = parsed.data;
  const user = await getCurrentUserLabel();

  return withOctokit(request, async (octokit) => {
    const repoData = await getRepo(octokit, owner, repo);
    if (!repoData) throw Object.assign(new Error("Repository not found"), { status: 404 });

    const headSha = repoData.lastCommitSha ?? "";
    const safety = await analyzeCleanupSafety(octokit, {
      owner,
      repo,
      branch,
      defaultBranch: repoData.defaultBranch,
      selectedShas,
      headSha,
    });

    const refName = backupRefName();
    const backupResult = await createBackupRef(octokit, owner, repo, headSha, refName);

    const script = generateManualCleanupScript({
      owner,
      repo,
      branch,
      headSha,
      backupRef: backupResult.ref,
      selectedShas,
    });

    const backupRecord: BackupRecord = {
      id: `${owner}-${repo}-${refName}`,
      repoFullName: repoData.fullName,
      branch,
      ref: refName,
      originalHeadSha: headSha,
      createdAt: new Date().toISOString(),
      createdBy: user,
      operation: "history-cleanup-plan",
      selectedShas,
      status: backupResult.created ? "created" : "reference-unavailable",
    };
    await store.addBackup(backupRecord);

    const auditEntry: AuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      user,
      repoFullName: repoData.fullName,
      branch,
      operation: "history-cleanup-plan",
      selectedShaCount: selectedShas.length,
      originalHeadSha: headSha,
      backupRef: backupResult.created ? refName : null,
      newHeadSha: null,
      result: "plan-generated",
      error: backupResult.error ?? null,
    };
    await store.addAuditEntry(auditEntry);

    if (!backupResult.created) {
      throw new ValidationError(
        `Could not create a backup reference on GitHub (${backupResult.error ?? "unknown error"}). No cleanup plan was generated so the pre-cleanup state is not put at risk without a recorded backup point.`,
      );
    }

    return {
      status: "plan-generated" as const,
      message:
        "Git history was NOT modified by this request. A backup reference was created and a manual cleanup script was generated for you to review and run locally.",
      backup: backupRecord,
      safety,
      script,
      githubCompareUrl: `${repoData.htmlUrl}/compare/${refName}...${branch}`,
    };
  });
}
