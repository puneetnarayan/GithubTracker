"use client";

import Link from "next/link";
import { DataState } from "@/components/ui/DataState";
import { StatCard } from "@/components/ui/Card";
import { useApi } from "@/lib/use-api";
import { formatKb } from "@/lib/format";
import type { RepoSummary } from "@/types";

interface ReposResponse {
  repos: RepoSummary[];
}

export default function StoragePage() {
  const state = useApi<ReposResponse>("/api/repos");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Storage</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Repository size breakdown. GitHub reports repository size directly; Git LFS usage and Actions
          artifact storage are separate metrics that GitHub&apos;s API does not expose per-repository through
          this application&apos;s current permissions, so they are not shown as a combined &quot;quota&quot; figure.
        </p>
      </div>

      <DataState
        state={state}
        empty={<p>No repositories were found for this GitHub account.</p>}
        emptyCheck={(d) => d.repos.length === 0}
        render={(data) => {
          const totalSize = data.repos.reduce((s, r) => s + r.sizeKb, 0);
          const sorted = [...data.repos].sort((a, b) => b.sizeKb - a.sizeKb);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Total repository size" value={formatKb(totalSize)} />
                <StatCard label="Largest repository" value={sorted[0]?.name ?? "—"} hint={sorted[0] ? formatKb(sorted[0].sizeKb) : undefined} />
                <StatCard label="Repositories analyzed" value={data.repos.length} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h2 className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
                  Repositories by size
                </h2>
                <table className="w-full text-sm">
                  <tbody>
                    {sorted.map((r) => {
                      const pct = totalSize > 0 ? (r.sizeKb / totalSize) * 100 : 0;
                      return (
                        <tr key={r.fullName} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-2">
                            <Link href={`/repositories/${r.owner}/${r.name}?tab=storage`} className="hover:underline">
                              {r.fullName}
                            </Link>
                          </td>
                          <td className="w-1/2 px-4 py-2">
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-2 rounded-full bg-slate-700 dark:bg-slate-300"
                                style={{ width: `${Math.max(pct, 1)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">{formatKb(r.sizeKb)}</td>
                        </tr>
                      );
                    })}
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
