"use client";

import { useState } from "react";
import { DataState } from "@/components/ui/DataState";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/lib/use-api";

interface ActivityResponse {
  repoActivity: Array<{ repo: string; d7: number; d30: number; d90: number; total: number; truncated: boolean }>;
  authorActivity: Array<{ author: string; count: number }>;
  mostActiveRepo: string | null;
  mostActiveAuthor: string | null;
  isPartial: boolean;
}

const MESSAGE_TERMS = ["fix", "feature", "update", "refactor", "test", "docs", "claude", "merge"];

export default function ActivityPage() {
  const state = useApi<ActivityResponse>("/api/activity");
  const [termFilter, setTermFilter] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Activity</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Development activity across your repositories, based on each repository&apos;s most recent commits.
        </p>
      </div>

      <DataState
        state={state}
        empty={<p>No activity data available.</p>}
        emptyCheck={(d) => d.repoActivity.length === 0}
        render={(data) => (
          <div className="space-y-4">
            {data.isPartial ? (
              <Badge tone="warning">
                Some totals are partial — only the most recent 100 commits per repository were scanned.
              </Badge>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Most active repository" value={data.mostActiveRepo ?? "—"} />
              <StatCard label="Most active author" value={data.mostActiveAuthor ?? "—"} />
              <StatCard label="Commits (7d)" value={data.repoActivity.reduce((s, r) => s + r.d7, 0)} />
              <StatCard label="Commits (30d)" value={data.repoActivity.reduce((s, r) => s + r.d30, 0)} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <h2 className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
                Repository activity
              </h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Repository</th>
                    <th className="px-4 py-2 text-right">7 days</th>
                    <th className="px-4 py-2 text-right">30 days</th>
                    <th className="px-4 py-2 text-right">90 days</th>
                    <th className="px-4 py-2 text-right">Scanned total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.repoActivity].sort((a, b) => b.d30 - a.d30).map((r) => (
                    <tr key={r.repo} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-2">{r.repo}</td>
                      <td className="px-4 py-2 text-right">{r.d7}</td>
                      <td className="px-4 py-2 text-right">{r.d30}</td>
                      <td className="px-4 py-2 text-right">{r.d90}</td>
                      <td className="px-4 py-2 text-right">
                        {r.total}
                        {r.truncated ? <span className="text-amber-500"> +</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <h2 className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
                Author activity
              </h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Author</th>
                    <th className="px-4 py-2 text-right">Commits scanned</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.authorActivity].sort((a, b) => b.count - a.count).slice(0, 15).map((a) => (
                    <tr key={a.author} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-2">{a.author}</td>
                      <td className="px-4 py-2 text-right">{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-2 text-sm font-semibold">Commit message term filter</h2>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Heuristic only — presence of a term (including &quot;Claude&quot;) does not confirm authorship
                by any particular tool or person.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MESSAGE_TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => setTermFilter(termFilter === term ? null : term)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      termFilter === term
                        ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                        : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              {termFilter ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Open the Commits page and use &quot;Message contains: {termFilter}&quot; to see matching
                  commits for a specific repository.
                </p>
              ) : null}
            </div>
          </div>
        )}
      />
    </div>
  );
}
