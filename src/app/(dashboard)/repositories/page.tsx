"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Download } from "lucide-react";
import { DataState } from "@/components/ui/DataState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/use-api";
import { formatKb, formatRelativeToNow } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { RepoSummary } from "@/types";

interface ReposResponse {
  repos: RepoSummary[];
  lastRefreshed: string;
}

type Visibility = "all" | "public" | "private";
type ArchivedFilter = "all" | "archived" | "active";
type ForkFilter = "all" | "fork" | "original";
type SortKey = "name" | "size" | "commits" | "updated" | "branches" | "tags";

export default function RepositoriesPage() {
  const state = useApi<ReposResponse>("/api/repos");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [archivedFilter, setArchivedFilter] = useState<ArchivedFilter>("all");
  const [forkFilter, setForkFilter] = useState<ForkFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const filterAndSort = (repos: RepoSummary[]) => {
    const filtered = repos.filter((r) => {
      if (search && !r.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      if (visibility === "public" && r.private) return false;
      if (visibility === "private" && !r.private) return false;
      if (archivedFilter === "archived" && !r.archived) return false;
      if (archivedFilter === "active" && r.archived) return false;
      if (forkFilter === "fork" && !r.fork) return false;
      if (forkFilter === "original" && r.fork) return false;
      return true;
    });
    const sorters: Record<SortKey, (a: RepoSummary, b: RepoSummary) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => b.sizeKb - a.sizeKb,
      commits: (a, b) => (b.commitCount ?? 0) - (a.commitCount ?? 0),
      updated: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      branches: (a, b) => (b.branchCount ?? 0) - (a.branchCount ?? 0),
      tags: (a, b) => (b.tagCount ?? 0) - (a.tagCount ?? 0),
    };
    return [...filtered].sort(sorters[sortKey]);
  };

  async function refresh() {
    setRefreshing(true);
    try {
      await fetch("/api/repos", { method: "POST" });
      state.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function exportCsv(repos: RepoSummary[]) {
    const csv = toCsv(
      repos.map((r) => ({
        Repository: r.fullName,
        Owner: r.owner,
        Private: r.private,
        Archived: r.archived,
        Fork: r.fork,
        DefaultBranch: r.defaultBranch,
        SizeKb: r.sizeKb,
        Commits: r.commitCount ?? "",
        Branches: r.branchCount ?? "",
        Tags: r.tagCount ?? "",
        LastUpdated: r.updatedAt,
      })),
    );
    downloadCsv("repositories.csv", csv);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Repositories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All repositories accessible to your GitHub account.
          </p>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repository name…"
          aria-label="Search repository name"
          className="w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          aria-label="Filter by visibility"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <select
          value={archivedFilter}
          onChange={(e) => setArchivedFilter(e.target.value as ArchivedFilter)}
          aria-label="Filter by archived state"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">Archived + active</option>
          <option value="active">Active only</option>
          <option value="archived">Archived only</option>
        </select>
        <select
          value={forkFilter}
          onChange={(e) => setForkFilter(e.target.value as ForkFilter)}
          aria-label="Filter by fork state"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">Forks + originals</option>
          <option value="original">Originals only</option>
          <option value="fork">Forks only</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Sort by"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="updated">Sort: Last updated</option>
          <option value="name">Sort: Name</option>
          <option value="size">Sort: Size</option>
          <option value="commits">Sort: Commit count</option>
          <option value="branches">Sort: Branch count</option>
          <option value="tags">Sort: Tag count</option>
        </select>
      </div>

      <DataState
        state={state}
        empty={<p>No repositories were found for this GitHub account.</p>}
        emptyCheck={(d) => d.repos.length === 0}
        render={(data) => {
          const rows = filterAndSort(data.repos);
          const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.fullName));

          return (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {rows.length} repositor{rows.length === 1 ? "y" : "ies"} match current filters
              </p>

              {selected.size > 0 ? (
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900">
                  <span>{selected.size} repositories selected</span>
                  <div className="flex gap-2">
                    <button
                      className="rounded bg-white/10 px-2 py-1 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20"
                      onClick={() => exportCsv(rows.filter((r) => selected.has(r.fullName)))}
                    >
                      Export CSV
                    </button>
                    <button
                      className="rounded bg-white/10 px-2 py-1 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={() => exportCsv(rows)}>
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="sticky-header bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label="Select all visible repositories"
                          checked={allVisibleSelected}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked ? new Set(rows.map((r) => r.fullName)) : new Set(),
                            )
                          }
                        />
                      </th>
                      <th className="px-3 py-2">Repository</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Default branch</th>
                      <th className="px-3 py-2 text-right">Size</th>
                      <th className="px-3 py-2 text-right">Commits</th>
                      <th className="px-3 py-2 text-right">Branches</th>
                      <th className="px-3 py-2 text-right">Tags</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.fullName} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.fullName}`}
                            checked={selected.has(r.fullName)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(r.fullName);
                              else next.delete(r.fullName);
                              setSelected(next);
                            }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Link href={`/repositories/${r.owner}/${r.name}`} className="font-medium hover:underline">
                            {r.fullName}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{r.owner}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Badge tone={r.private ? "neutral" : "success"}>{r.private ? "Private" : "Public"}</Badge>
                            {r.archived ? <Badge tone="archived">Archived</Badge> : null}
                            {r.fork ? <Badge tone="neutral">Fork</Badge> : null}
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.defaultBranch}</td>
                        <td className="px-3 py-2 text-right">{formatKb(r.sizeKb)}</td>
                        <td className="px-3 py-2 text-right">
                          {r.commitCount ?? "—"}
                          {r.commitCountIsEstimate ? <span className="text-slate-400"> ~</span> : null}
                        </td>
                        <td className="px-3 py-2 text-right">{r.branchCount ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{r.tagCount ?? "—"}</td>
                        <td className="px-3 py-2">{formatRelativeToNow(r.updatedAt)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 text-xs">
                            <a
                              href={r.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              GitHub
                            </a>
                            <Link href={`/repositories/${r.owner}/${r.name}?tab=commits`} className="text-blue-600 hover:underline dark:text-blue-400">
                              Commits
                            </Link>
                            <Link href={`/repositories/${r.owner}/${r.name}?tab=cleanup`} className="text-blue-600 hover:underline dark:text-blue-400">
                              Cleanup
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
