"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCommitSelection } from "@/lib/selection";
import { formatDateTime } from "@/lib/format";
import type { BackupRecord, CleanupSafetyAnalysis, CommitSummary } from "@/types";

interface PreviewResponse {
  repository: string;
  branch: string;
  headSha: string;
  selectedCount: number;
  remainingCount: number;
  oldestSelected: CommitSummary | null;
  newestSelected: CommitSummary | null;
  safety: CleanupSafetyAnalysis;
}

interface ExecuteResponse {
  status: "plan-generated";
  message: string;
  backup: BackupRecord;
  safety: CleanupSafetyAnalysis;
  script: string;
  githubCompareUrl: string;
}

const CONFIRM_TEXT = "REWRITE HISTORY";

function CleanupWizard() {
  const searchParams = useSearchParams();
  const repoFullName = searchParams.get("repo") ?? "";
  const branch = searchParams.get("branch") ?? "";
  const selection = useCommitSelection(repoFullName, branch);

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [ackPreview, setAckPreview] = useState(false);
  const [ackBackup, setAckBackup] = useState(false);
  const [ackHistoryChange, setAckHistoryChange] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const [owner, repoName] = repoFullName.split("/");

  async function runPreview() {
    setLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/cleanup/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo: repoName, branch, selectedShas: selection.shas }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to generate preview");
      setPreview(body);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function runExecute() {
    setExecuting(true);
    setExecuteError(null);
    try {
      const res = await fetch("/api/cleanup/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: repoName,
          branch,
          selectedShas: selection.shas,
          confirmText,
          acknowledgedPreview: ackPreview,
          acknowledgedBackup: ackBackup,
          acknowledgedHistoryChange: ackHistoryChange,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to generate cleanup plan");
      setResult(body);
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : "Failed to generate cleanup plan");
    } finally {
      setExecuting(false);
    }
  }

  if (!repoFullName || !branch) {
    return (
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Open this wizard from the Commits page after selecting commits, so the repository and branch are
          known.
        </p>
      </Card>
    );
  }

  const canConfirm =
    !!preview && ackPreview && ackBackup && ackHistoryChange && confirmText === CONFIRM_TEXT;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">History Rewrite Wizard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This tool never deletes a commit by simply removing it from a list. Removing history requires
          rewriting every commit after it and force-pushing the result.
        </p>
      </div>

      {/* Step 1 — Selection review */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold">Step 1 — Selection review</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Repository</dt>
            <dd>{repoFullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Branch</dt>
            <dd>{branch}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Commits selected</dt>
            <dd>{selection.shas.length}</dd>
          </div>
        </dl>
        {selection.shas.length === 0 ? (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            No commits are selected for this repository/branch. Go back to the Commits page and select at
            least one commit.
          </p>
        ) : (
          <Button className="mt-3" onClick={runPreview} disabled={loadingPreview}>
            {loadingPreview ? "Generating preview…" : "Generate preview"}
          </Button>
        )}
        {previewError ? <p className="mt-2 text-sm text-red-600">{previewError}</p> : null}
      </Card>

      {preview ? (
        <>
          {/* Step 2 — Safety analysis */}
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4" /> Step 2 — Dependency &amp; safety analysis
            </h2>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <Badge tone={preview.safety.isDefaultBranch ? "warning" : "neutral"}>
                {preview.safety.isDefaultBranch ? "Default branch" : "Non-default branch"}
              </Badge>
              <Badge tone={preview.safety.isProtectedBranch ? "protected" : "neutral"}>
                {preview.safety.isProtectedBranch ? "Protected" : "Not protected"}
              </Badge>
              <Badge tone={preview.safety.impact === "high" ? "error" : preview.safety.impact === "medium" ? "warning" : "success"}>
                Impact: {preview.safety.impact}
              </Badge>
              {preview.safety.requiresForcePush ? <Badge tone="error">Force push required</Badge> : null}
            </div>
            {preview.safety.warnings.length > 0 ? (
              <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                {preview.safety.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No additional risk factors were detected.</p>
            )}
          </Card>

          {/* Step 3+4 — Backup & Preview */}
          <Card>
            <h2 className="mb-2 text-sm font-semibold">Steps 3–4 — Backup &amp; preview</h2>
            <pre className="overflow-x-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
{`HISTORY REWRITE PREVIEW

Repository:        ${preview.repository}
Branch:             ${preview.branch}
Current HEAD:       ${preview.headSha.slice(0, 12)}...
Selected commits:   ${preview.selectedCount}
Commits remaining:  ${preview.remainingCount}
Default branch:     ${preview.safety.isDefaultBranch ? "YES" : "no"}
Protected:          ${preview.safety.isProtectedBranch ? "YES" : "no"}
Force push:         REQUIRED
Backup:             will be created on confirmation below
Potential impact:   ${preview.safety.impact.toUpperCase()}`}
            </pre>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Oldest selected: {preview.oldestSelected ? `${preview.oldestSelected.shortSha} (${formatDateTime(preview.oldestSelected.authorDate)})` : "—"}
              {" · "}
              Newest selected: {preview.newestSelected ? `${preview.newestSelected.shortSha} (${formatDateTime(preview.newestSelected.authorDate)})` : "—"}
            </p>
          </Card>

          {/* Step 5 — Confirmation */}
          <Card className="border-red-300 dark:border-red-900">
            <h2 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
              Step 5 — Explicit confirmation
            </h2>
            <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
              This operation changes the commit history of the selected branch. Existing commit SHAs may
              change, collaborators may need to resynchronize, and the operation may require a force push.
            </p>
            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={ackPreview} onChange={(e) => setAckPreview(e.target.checked)} className="mt-0.5" />
                I have reviewed the preview above.
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={ackBackup} onChange={(e) => setAckBackup(e.target.checked)} className="mt-0.5" />
                I understand a backup reference will be created before any plan is generated.
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={ackHistoryChange} onChange={(e) => setAckHistoryChange(e.target.checked)} className="mt-0.5" />
                I understand that Git history will change and this may require a force push.
              </label>
            </div>
            <label className="mt-3 block text-sm">
              Type <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{CONFIRM_TEXT}</code> to enable the next step:
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <Button
              variant="danger"
              className="mt-4"
              disabled={!canConfirm || executing}
              onClick={runExecute}
            >
              {executing ? "Generating plan…" : "Rewrite History…"}
            </Button>
            {executeError ? <p className="mt-2 text-sm text-red-600">{executeError}</p> : null}
          </Card>
        </>
      ) : null}

      {/* Steps 6-8 — Execute / Validate / Result */}
      {result ? (
        <Card className="border-emerald-300 dark:border-emerald-900">
          <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Steps 6–8 — Result
          </h2>
          <p className="mb-3 text-sm font-medium">{result.message}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Backup reference</dt>
              <dd className="font-mono text-xs">{result.backup.ref}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Backup status</dt>
              <dd>
                <Badge tone={result.backup.status === "created" ? "success" : "warning"}>{result.backup.status}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Compare on GitHub</dt>
              <dd>
                <a href={result.githubCompareUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                  Open compare view
                </a>
              </dd>
            </div>
          </dl>

          <h3 className="mt-4 mb-1 text-sm font-semibold">Generated cleanup script</h3>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Review this script carefully before running it locally. It was not executed automatically.
          </p>
          <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
            {result.script}
          </pre>
          <Button
            variant="secondary"
            className="mt-2"
            onClick={() => {
              const blob = new Blob([result.script], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "cleanup-plan.sh";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Download script
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

export default function CleanupPage() {
  return (
    <Suspense fallback={null}>
      <CleanupWizard />
    </Suspense>
  );
}
