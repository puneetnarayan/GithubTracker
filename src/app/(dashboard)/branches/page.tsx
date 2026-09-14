"use client";

import { useEffect, useState } from "react";
import { DataState } from "@/components/ui/DataState";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/lib/use-api";
import type { BranchInfo, RepoSummary } from "@/types";

interface ReposResponse {
  repos: RepoSummary[];
}
interface BranchesResponse {
  branches: BranchInfo[];
}

export default function BranchesPage() {
  const reposState = useApi<ReposResponse>("/api/repos");
  const [repoFullName, setRepoFullName] = useState("");
  const [search, setSearch] = useState("");
  const [protectedOnly, setProtectedOnly] = useState<"all" | "protected" | "unprotected">("all");

  const repos = reposState.status === "success" ? reposState.data.repos : [];
  useEffect(() => {
    if (!repoFullName && repos.length > 0) setRepoFullName(repos[0].fullName);
  }, [repos, repoFullName]);

  const [owner, repo] = repoFullName.split("/");
  const branchesState = useApi<BranchesResponse>(
    owner && repo ? `/api/repos/${owner}/${repo}/branches` : null,
    [repoFullName],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Branches</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Branch protection and status per repository.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={repoFullName}
          onChange={(e) => setRepoFullName(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {repos.map((r) => (
            <option key={r.fullName} value={r.fullName}>
              {r.fullName}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search branch…"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <select
          value={protectedOnly}
          onChange={(e) => setProtectedOnly(e.target.value as never)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All branches</option>
          <option value="protected">Protected only</option>
          <option value="unprotected">Unprotected only</option>
        </select>
      </div>

      <DataState
        state={branchesState}
        empty={<p>No branches found.</p>}
        emptyCheck={(d) => d.branches.length === 0}
        render={(data) => {
          const rows = data.branches.filter((b) => {
            if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (protectedOnly === "protected" && !b.protected) return false;
            if (protectedOnly === "unprotected" && b.protected) return false;
            return true;
          });
          return (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">Protected</th>
                    <th className="px-3 py-2">Default</th>
                    <th className="px-3 py-2 text-right">Ahead</th>
                    <th className="px-3 py-2 text-right">Behind</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.name} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 font-medium">{b.name}</td>
                      <td className="px-3 py-2">{b.protected ? <Badge tone="protected">Protected</Badge> : "—"}</td>
                      <td className="px-3 py-2">{b.isDefault ? <Badge tone="success">Default</Badge> : "—"}</td>
                      <td className="px-3 py-2 text-right">{b.ahead ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{b.behind ?? "—"}</td>
                      <td className="px-3 py-2">
                        <a
                          href={`/commits?repo=${encodeURIComponent(repoFullName)}&branch=${encodeURIComponent(b.name)}`}
                          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View commits
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      />
    </div>
  );
}
