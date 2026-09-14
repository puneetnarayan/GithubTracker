"use client";

import { use } from "react";
import Link from "next/link";
import { DataState } from "@/components/ui/DataState";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/lib/use-api";
import { formatDateTime } from "@/lib/format";
import type { CommitDetail } from "@/types";

export default function CommitDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; sha: string }>;
}) {
  const { owner, repo, sha } = use(params);
  const state = useApi<CommitDetail>(`/api/repos/${owner}/${repo}/commits/${sha}`);

  return (
    <div className="space-y-4">
      <Link href="/commits" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Back to commits
      </Link>

      <DataState
        state={state}
        empty={<p>Commit not found.</p>}
        render={(commit) => (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-lg font-semibold">{commit.shortSha}</h1>
                {commit.isMerge ? <Badge tone="neutral">Merge commit</Badge> : null}
                <a
                  href={commit.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  View on GitHub
                </a>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
                {commit.message}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Full SHA</dt>
                  <dd className="font-mono text-xs break-all">{commit.sha}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Author</dt>
                  <dd>{commit.authorName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Committer</dt>
                  <dd>{commit.committerName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Date</dt>
                  <dd>{formatDateTime(commit.authorDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Parent commit(s)</dt>
                  <dd className="font-mono text-xs">
                    {commit.parents.length > 0 ? commit.parents.map((p) => p.slice(0, 7)).join(", ") : "None (root commit)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Additions / Deletions</dt>
                  <dd>
                    <span className="text-emerald-600 dark:text-emerald-400">+{commit.additions ?? 0}</span>{" "}
                    <span className="text-red-600 dark:text-red-400">-{commit.deletions ?? 0}</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <h2 className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">
                Changed files ({commit.files.length})
              </h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {commit.files.map((f) => (
                  <li key={f.filename} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <span className="truncate font-mono text-xs">{f.filename}</span>
                    <span className="flex shrink-0 gap-2 text-xs">
                      <Badge tone="neutral">{f.status}</Badge>
                      <span className="text-emerald-600 dark:text-emerald-400">+{f.additions}</span>
                      <span className="text-red-600 dark:text-red-400">-{f.deletions}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      />
    </div>
  );
}
