"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataState } from "@/components/ui/DataState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/use-api";
import { useCommitSelection } from "@/lib/selection";
import { formatDateTime } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { BranchInfo, CommitSummary, RepoSummary } from "@/types";

interface ReposResponse {
  repos: RepoSummary[];
}
interface BranchesResponse {
  branches: BranchInfo[];
}
interface CommitsResponse {
  commits: CommitSummary[];
  hasNextPage: boolean;
}

const QUICK_FILTERS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

export default function CommitsPage() {
  const router = useRouter();
  const reposState = useApi<ReposResponse>("/api/repos");

  const [repoFullName, setRepoFullName] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [author, setAuthor] = useState("");
  const [messageContains, setMessageContains] = useState("");
  const [shaFilter, setShaFilter] = useState("");
  const [minFiles, setMinFiles] = useState("");
  const [maxFiles, setMaxFiles] = useState("");
  const [minAdditions, setMinAdditions] = useState("");
  const [minDeletions, setMinDeletions] = useState("");
  const [commitType, setCommitType] = useState<"all" | "normal" | "merge">("all");
  const [page, setPage] = useState(1);

  const repos = reposState.status === "success" ? reposState.data.repos : [];
  useEffect(() => {
    if (!repoFullName && repos.length > 0) {
      setRepoFullName(repos[0].fullName);
      setBranch(repos[0].defaultBranch);
    }
  }, [repos, repoFullName]);

  const [owner, repoName] = repoFullName.split("/");
  const branchesState = useApi<BranchesResponse>(
    owner && repoName ? `/api/repos/${owner}/${repoName}/branches` : null,
    [repoFullName],
  );

  useEffect(() => {
    setPage(1);
  }, [repoFullName, branch, since, until, author, messageContains, shaFilter, minFiles, maxFiles, minAdditions, minDeletions, commitType]);

  const commitsUrl = useMemo(() => {
    if (!owner || !repoName || !branch) return null;
    const params = new URLSearchParams({ branch, page: String(page), perPage: "50" });
    if (since) params.set("since", new Date(since).toISOString());
    if (until) params.set("until", new Date(until).toISOString());
    if (author) params.set("author", author);
    return `/api/repos/${owner}/${repoName}/commits?${params.toString()}`;
  }, [owner, repoName, branch, since, until, author, page]);

  const commitsState = useApi<CommitsResponse>(commitsUrl, [commitsUrl]);
  const selection = useCommitSelection(repoFullName, branch);

  function applyQuickFilter(days: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    setSince(from.toISOString().slice(0, 10));
    setUntil("");
  }

  function clientFilter(commits: CommitSummary[]): CommitSummary[] {
    return commits.filter((c) => {
      if (messageContains && !c.message.toLowerCase().includes(messageContains.toLowerCase())) return false;
      if (shaFilter && !c.sha.startsWith(shaFilter.toLowerCase())) return false;
      if (minFiles && (c.filesChanged ?? 0) < parseInt(minFiles, 10)) return false;
      if (maxFiles && (c.filesChanged ?? 0) > parseInt(maxFiles, 10)) return false;
      if (minAdditions && (c.additions ?? 0) < parseInt(minAdditions, 10)) return false;
      if (minDeletions && (c.deletions ?? 0) < parseInt(minDeletions, 10)) return false;
      if (commitType === "normal" && c.isMerge) return false;
      if (commitType === "merge" && !c.isMerge) return false;
      return true;
    });
  }

  function exportSelected(commits: CommitSummary[]) {
    const rows = commits
      .filter((c) => selection.isSelected(c.sha))
      .map((c) => ({
        Repository: repoFullName,
        Branch: branch,
        SHA: c.sha,
        Date: c.authorDate,
        Author: c.authorName,
        Message: c.messageHeadline,
        FilesChanged: c.filesChanged ?? "",
        Additions: c.additions ?? "",
        Deletions: c.deletions ?? "",
      }));
    downloadCsv("commits-selected.csv", toCsv(rows));
  }

  function goToCleanup() {
    router.push(`/cleanup?repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(branch)}`);
  }

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Commits</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Browse, filter, and select commits for export or history cleanup.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Repository
          <select
            value={repoFullName}
            onChange={(e) => {
              const r = repos.find((x) => x.fullName === e.target.value);
              setRepoFullName(e.target.value);
              setBranch(r?.defaultBranch ?? "");
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {repos.map((r) => (
              <option key={r.fullName} value={r.fullName}>
                {r.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Branch
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {branchesState.status === "success"
              ? branchesState.data.branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))
              : branch ? <option value={branch}>{branch}</option> : null}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Since
          <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Until
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Author contains
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Message contains
          <input value={messageContains} onChange={(e) => setMessageContains(e.target.value)} placeholder="fix, feature, Claude…" className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          SHA starts with
          <input value={shaFilter} onChange={(e) => setShaFilter(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Commit type
          <select value={commitType} onChange={(e) => setCommitType(e.target.value as never)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="all">All</option>
            <option value="normal">Normal only</option>
            <option value="merge">Merge only</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Files changed &gt;=
          <input type="number" value={minFiles} onChange={(e) => setMinFiles(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Files changed &lt;=
          <input type="number" value={maxFiles} onChange={(e) => setMaxFiles(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Additions &gt;=
          <input type="number" value={minAdditions} onChange={(e) => setMinAdditions(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
          Deletions &gt;=
          <input type="number" value={minDeletions} onChange={(e) => setMinDeletions(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
        </label>

        <div className="flex flex-wrap items-end gap-1.5 lg:col-span-4">
          {QUICK_FILTERS.map((qf) => (
            <button
              key={qf.label}
              onClick={() => applyQuickFilter(qf.days)}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {qf.label}
            </button>
          ))}
          <button
            onClick={() => {
              setSince("");
              setUntil("");
              setAuthor("");
              setMessageContains("");
              setShaFilter("");
              setMinFiles("");
              setMaxFiles("");
              setMinAdditions("");
              setMinDeletions("");
              setCommitType("all");
            }}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Clear filters
          </button>
        </div>
      </div>

      <DataState
        state={commitsState}
        empty={<p>No commits match the current filters.</p>}
        emptyCheck={(d) => d.commits.length === 0}
        render={(data) => {
          const rows = clientFilter(data.commits);
          const allVisibleSelected = rows.length > 0 && rows.every((c) => selection.isSelected(c.sha));

          return (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {rows.length} commit{rows.length === 1 ? "" : "s"} match current filters on this page
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  className="rounded-full border border-slate-300 px-2.5 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  onClick={() =>
                    selection.selectMany(
                      allVisibleSelected
                        ? selection.shas.filter((s) => !rows.some((r) => r.sha === s))
                        : [...selection.shas, ...rows.map((r) => r.sha)],
                    )
                  }
                >
                  {allVisibleSelected ? "Deselect visible" : "Select all visible"}
                </button>
                <button
                  className="rounded-full border border-slate-300 px-2.5 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  onClick={() => selection.selectMany(rows.map((r) => r.sha).filter((s) => !selection.isSelected(s)).concat(selection.shas.filter((s) => !rows.some((r) => r.sha === s))))}
                >
                  Invert selection (visible)
                </button>
                <button
                  className="rounded-full border border-slate-300 px-2.5 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  onClick={() => selection.clear()}
                >
                  Clear selection
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky-header bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2" />
                      <th className="px-3 py-2">SHA</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Author</th>
                      <th className="px-3 py-2">Message</th>
                      <th className="px-3 py-2 text-right">Files</th>
                      <th className="px-3 py-2 text-right">+</th>
                      <th className="px-3 py-2 text-right">-</th>
                      <th className="px-3 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.sha} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select commit ${c.shortSha}`}
                            checked={selection.isSelected(c.sha)}
                            onChange={() => selection.toggle(c.sha)}
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          <a href={`/commits/${owner}/${repoName}/${c.sha}`} className="hover:underline">
                            {c.shortSha}
                          </a>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(c.authorDate)}</td>
                        <td className="px-3 py-2">{c.authorName}</td>
                        <td className="px-3 py-2 max-w-md truncate" title={c.message}>
                          {c.messageHeadline}
                        </td>
                        <td className="px-3 py-2 text-right">{c.filesChanged ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">
                          {c.additions ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">
                          {c.deletions ?? "—"}
                        </td>
                        <td className="px-3 py-2">{c.isMerge ? <Badge tone="neutral">Merge</Badge> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400">Page {page}</span>
                <Button variant="ghost" disabled={!data.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>

              {selection.shas.length > 0 ? (
                <div className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white shadow-lg md:left-64 dark:border-slate-700">
                  <span className="font-medium">{selection.shas.length} commits selected</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/20"
                      onClick={() => exportSelected(data.commits)}
                    >
                      Export
                    </button>
                    <button
                      className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/20"
                      onClick={() =>
                        navigator.clipboard?.writeText(selection.shas.join("\n"))
                      }
                    >
                      Copy SHAs
                    </button>
                    <button className="rounded bg-red-600 px-3 py-1.5 font-semibold hover:bg-red-500" onClick={goToCleanup}>
                      Rewrite History…
                    </button>
                    <button className="rounded bg-white/10 px-3 py-1.5 hover:bg-white/20" onClick={() => selection.clear()}>
                      Clear selection
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}
