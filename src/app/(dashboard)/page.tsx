"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataState } from "@/components/ui/DataState";
import { useApi } from "@/lib/use-api";
import { formatDate, formatKb, formatRelativeToNow } from "@/lib/format";
import type { RepoSummary } from "@/types";

interface ReposResponse {
  repos: RepoSummary[];
  lastRefreshed: string;
}
interface ActivityResponse {
  repoActivity: Array<{ repo: string; d7: number; d30: number; d90: number; total: number }>;
  isPartial: boolean;
}

function attentionReasons(repo: RepoSummary): string[] {
  const reasons: string[] = [];
  if (repo.sizeKb > 500_000) reasons.push("Very large repository");
  if ((repo.commitCount ?? 0) > 5000) reasons.push("Very high commit count");
  const daysSincePush = (Date.now() - new Date(repo.pushedAt).getTime()) / 86400000;
  if (daysSincePush > 365) reasons.push("Stale repository (no push in over a year)");
  return reasons;
}

export default function DashboardPage() {
  const repoState = useApi<ReposResponse>("/api/repos");
  const activityState = useApi<ActivityResponse>("/api/activity");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Overview of your accessible GitHub repositories.
        </p>
      </div>

      <DataState
        state={repoState}
        empty={<p>No repositories were found for this GitHub account.</p>}
        emptyCheck={(d) => d.repos.length === 0}
        render={(data) => {
          const { repos, lastRefreshed } = data;
          const totalSize = repos.reduce((sum, r) => sum + r.sizeKb, 0);
          const totalCommits = repos.reduce((sum, r) => sum + (r.commitCount ?? 0), 0);
          const totalBranches = repos.reduce((sum, r) => sum + (r.branchCount ?? 0), 0);
          const totalTags = repos.reduce((sum, r) => sum + (r.tagCount ?? 0), 0);
          const largest = [...repos].sort((a, b) => b.sizeKb - a.sizeKb)[0];
          const attention = repos.filter((r) => attentionReasons(r).length > 0);
          const sizeChartData = [...repos]
            .sort((a, b) => b.sizeKb - a.sizeKb)
            .slice(0, 8)
            .map((r) => ({ name: r.name, sizeMb: Math.round(r.sizeKb / 1024) }));

          return (
            <div className="space-y-6">
              <p className="text-xs text-slate-400">Last refreshed: {formatDate(lastRefreshed)}</p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label="Total repositories" value={repos.length} />
                <StatCard label="Public" value={repos.filter((r) => !r.private).length} />
                <StatCard label="Private" value={repos.filter((r) => r.private).length} />
                <StatCard label="Archived" value={repos.filter((r) => r.archived).length} />
                <StatCard label="Total size" value={formatKb(totalSize)} />
                <StatCard label="Largest repository" value={largest?.name ?? "—"} hint={largest ? formatKb(largest.sizeKb) : undefined} />
                <StatCard label="Total commits" value={totalCommits.toLocaleString()} hint="Cached, may include estimates" />
                <StatCard label="Total branches" value={totalBranches} />
                <StatCard label="Total tags" value={totalTags} />
                <StatCard label="Needing attention" value={attention.length} />
              </div>

              <DataState
                state={activityState}
                empty={<p>No commit activity available.</p>}
                render={(activity) => (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Commits (7 days)"
                      value={activity.repoActivity.reduce((s, r) => s + r.d7, 0)}
                    />
                    <StatCard
                      label="Commits (30 days)"
                      value={activity.repoActivity.reduce((s, r) => s + r.d30, 0)}
                    />
                    <StatCard
                      label="Commits (90 days)"
                      value={activity.repoActivity.reduce((s, r) => s + r.d90, 0)}
                    />
                  </div>
                )}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Repository size (largest 8)
                  </h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sizeChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 11 }} unit=" MB" />
                        <Tooltip />
                        <Bar dataKey="sizeMb" fill="#334155" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <DataState
                  state={activityState}
                  empty={<p>No commit activity available.</p>}
                  render={(activity) => (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        Commit activity (30 days, top repos)
                      </h2>
                      {activity.isPartial ? (
                        <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                          Some repositories have more history than was scanned — totals for those are partial.
                        </p>
                      ) : null}
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[...activity.repoActivity].sort((a, b) => b.d30 - a.d30).slice(0, 8)}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                            <XAxis dataKey="repo" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="d30" fill="#2563eb" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h2 className="border-b border-slate-200 p-4 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
                  Recently updated repositories
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-2">Repository</th>
                        <th className="px-4 py-2 text-right">Size</th>
                        <th className="px-4 py-2 text-right">Commits</th>
                        <th className="px-4 py-2">Last commit</th>
                        <th className="px-4 py-2">Branch</th>
                        <th className="px-4 py-2">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...repos]
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                        .slice(0, 8)
                        .map((r) => (
                          <tr key={r.fullName} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-2">
                              <Link href={`/repositories/${r.owner}/${r.name}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                                {r.fullName}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-right">{formatKb(r.sizeKb)}</td>
                            <td className="px-4 py-2 text-right">{r.commitCount ?? "—"}</td>
                            <td className="px-4 py-2">{formatRelativeToNow(r.lastCommitDate)}</td>
                            <td className="px-4 py-2">{r.defaultBranch}</td>
                            <td className="px-4 py-2">{formatRelativeToNow(r.updatedAt)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h2 className="border-b border-slate-200 p-4 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-slate-50">
                  Attention required
                </h2>
                {attention.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    No repositories currently need attention.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attention.map((r) => (
                      <li key={r.fullName} className="flex flex-wrap items-center justify-between gap-2 p-4">
                        <Link href={`/repositories/${r.owner}/${r.name}`} className="text-sm font-medium hover:underline">
                          {r.fullName}
                        </Link>
                        <div className="flex flex-wrap gap-1.5">
                          {attentionReasons(r).map((reason) => (
                            <Badge key={reason} tone="warning">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
