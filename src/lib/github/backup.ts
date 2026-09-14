import type { Octokit } from "octokit";
import { isMockMode } from "@/lib/config";

export function backupRefName(date = new Date()): string {
  const iso = date.toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, 19);
  return `backup-before-cleanup-${iso}`;
}

/**
 * Creates a real Git ref on GitHub pointing at the current HEAD, so the
 * pre-cleanup state stays reachable even after a history rewrite. This is
 * a genuine, verifiable backup mechanism (no local filesystem or long-lived
 * process required) — it just calls the Git Data API.
 *
 * Returns { created: false } rather than throwing when the ref cannot be
 * created (e.g. insufficient permission), so callers can decide whether to
 * proceed, per the "never rewrite without backup where technically
 * possible" rule — but if creation fails, the wizard must not claim a
 * backup exists.
 */
export async function createBackupRef(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string,
  refName: string,
): Promise<{ created: boolean; ref: string; error?: string }> {
  if (isMockMode()) {
    return { created: true, ref: refName };
  }

  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${refName}`,
      sha: headSha,
    });
    return { created: true, ref: refName };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    return {
      created: false,
      ref: refName,
      error: err.message ?? `Failed to create backup ref (status ${err.status ?? "unknown"})`,
    };
  }
}
