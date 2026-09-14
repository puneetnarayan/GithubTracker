"use client";

import { useEffect, useState } from "react";
import { DataState } from "@/components/ui/DataState";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/lib/format";
import type { ReleaseInfo, RepoSummary, TagInfo } from "@/types";

interface ReposResponse {
  repos: RepoSummary[];
}

export default function TagsReleasesPage() {
  const reposState = useApi<ReposResponse>("/api/repos");
  const [repoFullName, setRepoFullName] = useState("");

  const repos = reposState.status === "success" ? reposState.data.repos : [];
  useEffect(() => {
    if (!repoFullName && repos.length > 0) setRepoFullName(repos[0].fullName);
  }, [repos, repoFullName]);

  const [owner, repo] = repoFullName.split("/");
  const tagsState = useApi<{ tags: TagInfo[] }>(owner && repo ? `/api/repos/${owner}/${repo}/tags` : null, [repoFullName]);
  const releasesState = useApi<{ releases: ReleaseInfo[] }>(
    owner && repo ? `/api/repos/${owner}/${repo}/releases` : null,
    [repoFullName],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Tags & Releases</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Per-repository tag and release history.</p>
      </div>

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <h2 className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">Tags</h2>
          <DataState
            state={tagsState}
            empty={<p className="p-4">No tags found for this repository.</p>}
            emptyCheck={(d) => d.tags.length === 0}
            render={(data) => (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.tags.map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="font-mono text-xs text-slate-500">{t.commitSha.slice(0, 7)}</span>
                    <Badge tone="neutral">{t.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <h2 className="border-b border-slate-200 p-4 text-sm font-semibold dark:border-slate-800">Releases</h2>
          <DataState
            state={releasesState}
            empty={<p className="p-4">No releases found for this repository.</p>}
            emptyCheck={(d) => d.releases.length === 0}
            render={(data) => (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.releases.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                    <div>
                      <div className="font-medium">{r.name ?? r.tagName}</div>
                      <div className="text-xs text-slate-500">{formatDate(r.publishedAt)}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {r.draft ? <Badge tone="neutral">Draft</Badge> : null}
                      {r.prerelease ? <Badge tone="warning">Prerelease</Badge> : null}
                      <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
                        GitHub
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          />
        </div>
      </div>
    </div>
  );
}
