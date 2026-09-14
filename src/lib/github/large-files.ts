import type { Octokit } from "octokit";
import type { LargeFileEntry } from "@/types";
import { isMockMode } from "@/lib/config";
import { mockListLargeFiles } from "@/lib/github/mock-data";

const HIGH_RISK_EXTENSIONS = [".zip", ".rar", ".7z", ".iso", ".exe", ".dll", ".tar", ".mp4", ".mov"];
const MEDIUM_RISK_EXTENSIONS = [".pdf", ".psd", ".pkg", ".dmg", ".bin"];
const GENERATED_PATH_HINTS = ["node_modules/", "dist/", "build/", ".next/", "vendor/", "target/"];

const SIZE_THRESHOLD_BYTES = 1_000_000; // 1 MB — below this we don't flag anything

function classify(path: string, sizeBytes: number): { risk: LargeFileEntry["risk"]; reason: string } | null {
  if (sizeBytes < SIZE_THRESHOLD_BYTES) return null;
  const lower = path.toLowerCase();

  if (GENERATED_PATH_HINTS.some((hint) => lower.includes(hint))) {
    return { risk: "high", reason: "Located in a directory typically excluded via .gitignore" };
  }
  if (HIGH_RISK_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { risk: "high", reason: "Binary/archive file type rarely belongs in Git history" };
  }
  if (MEDIUM_RISK_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { risk: "medium", reason: "Large document/binary — consider Git LFS or external storage" };
  }
  if (sizeBytes > 20_000_000) {
    return { risk: "medium", reason: "Unusually large file for a Git repository" };
  }
  return { risk: "low", reason: "Large but may be a legitimate tracked asset" };
}

/**
 * Analyzes the default branch's file tree for large or risky files.
 *
 * This only inspects the current tree (via the Git Trees API with
 * recursive=1), not full history — GitHub's API has no efficient way to
 * report "largest file ever committed" without cloning the repository, so
 * this is explicitly a current-state heuristic, not a historical audit.
 */
export async function analyzeLargeFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<LargeFileEntry[]> {
  if (isMockMode()) return mockListLargeFiles(owner, repo);

  const { data: refData } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  const treeSha = refData.commit.sha;

  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "true",
  });

  const entries: LargeFileEntry[] = [];
  for (const item of tree.tree) {
    if (item.type !== "blob" || !item.path || typeof item.size !== "number") continue;
    const classification = classify(item.path, item.size);
    if (!classification) continue;
    entries.push({
      path: item.path,
      sizeBytes: item.size,
      lastChangedSha: null,
      lastChangedDate: null,
      risk: classification.risk,
      reason: classification.reason,
    });
  }

  return entries.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 100);
}
