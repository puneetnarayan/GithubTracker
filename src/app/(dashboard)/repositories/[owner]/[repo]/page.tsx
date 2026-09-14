"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { DataState } from "@/components/ui/DataState";
import { StatCard, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/lib/use-api";
import { formatKb, formatDate, formatBytes } from "@/lib/format";
import type {
  BranchInfo,
  CommitSummary,
  LargeFileEntry,
  ReleaseInfo,
  RepoSummary,
  TagInfo,
} from "@/types";

const TABS = ["overview", "commits", "branches", "tags", "releases", "storage", "cleanup"] as const;
type Tab = (typeof TABS)[number];

export default function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as Tab) || "overview";

  const repoState = useApi<RepoSummary>(`/api/repos/${owner}/${repo}`);

  function setTab(next: Tab) {
    router.push(`/repositories/${owner}/${repo}?tab=${next}`);
  }

  return (
    <div className="space-y-4">
      <DataState
        state={repoState}
        empty={<p>Repository not found.</p>}
        render={(repoData) => (
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold">{repoData.fullName}</h1>
                <Badge tone={repoData.private ? "neutral" : "success"}>{repoData.private ? "Private" : "Public"}</Badge>
                {repoData.archived ? <Badge tone="archived">Archived</Badge> : null}
                <a href={repoData.htmlUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm text-blue-600 hover:underline dark:text-blue-400">
                  View on GitHub
                </a>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{repoData.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Default branch" value={repoData.defaultBranch} />
                <StatCard label="Size" value={formatKb(repoData.sizeKb)} />
                <StatCard label="Commits" value={repoData.commitCount ?? "—"} />
                <StatCard label="Last commit" value={formatDate(repoData.lastCommitDate)} />
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium capitalize ${
                    tab === t
                      ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            {tab === "overview" ? <OverviewTab repo={repoData} /> : null}
            {tab === "commits" ? <CommitsTab owner={owner} repo={repo} branch={repoData.defaultBranch} /> : null}
            {tab === "branches" ? <BranchesTab owner={owner} repo={repo} /> : null}
            {tab === "tags" ? <TagsTab owner={owner} repo={repo} /> : null}
            {tab === "releases" ? <ReleasesTab owner={owner} repo={repo} /> : null}
            {tab === "storage" ? <StorageTab owner={owner} repo={repo} /> : null}
            {tab === "cleanup" ? <CleanupTab owner={owner} repo={repo} branch={repoData.defaultBranch} /> : null}
          </>
        )}
      />
    </div>
  );
}

function OverviewTab({ repo }: { repo: RepoSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Branches" value={repo.branchCount ?? "—"} />
      <StatCard label="Tags" value={repo.tagCount ?? "—"} />
      <StatCard label="Open issues" value={repo.openIssuesCount} />
      <StatCard label="Language" value={repo.language ?? "—"} />
    </div>
  );
}

function CommitsTab({ owner, repo, branch }: { owner: string; repo: string; branch: string }) {
  const state = useApi<{ commits: CommitSummary[] }>(
    `/api/repos/${owner}/${repo}/commits?branch=${encodeURIComponent(branch)}&perPage=20`,
  );
  return (
    <DataState
      state={state}
      empty={<p>No commits match the current filters.</p>}
      emptyCheck={(d) => d.commits.length === 0}
      render={(data) => (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.commits.map((c) => (
              <li key={c.sha} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/commits/${owner}/${repo}/${c.sha}`} className="font-mono text-xs hover:underline">
                  {c.shortSha}
                </Link>
                <span className="truncate flex-1 px-2">{c.messageHeadline}</span>
                <span className="shrink-0 text-xs text-slate-500">{formatDate(c.authorDate)}</span>
              </li>
            ))}
          </ul>
          <Link href="/commits" className="mt-2 inline-block text-xs text-blue-600 hover:underline dark:text-blue-400">
            Open full commit browser →
          </Link>
        </Card>
      )}
    />
  );
}

function BranchesTab({ owner, repo }: { owner: string; repo: string }) {
  const state = useApi<{ branches: BranchInfo[] }>(`/api/repos/${owner}/${repo}/branches`);
  return (
    <DataState
      state={state}
      empty={<p>No branches found.</p>}
      emptyCheck={(d) => d.branches.length === 0}
      render={(data) => (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.branches.map((b) => (
              <li key={b.name} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium">{b.name}</span>
                <div className="flex gap-1.5">
                  {b.isDefault ? <Badge tone="success">Default</Badge> : null}
                  {b.protected ? <Badge tone="protected">Protected</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    />
  );
}

function TagsTab({ owner, repo }: { owner: string; repo: string }) {
  const state = useApi<{ tags: TagInfo[] }>(`/api/repos/${owner}/${repo}/tags`);
  return (
    <DataState
      state={state}
      empty={<p>No tags found.</p>}
      emptyCheck={(d) => d.tags.length === 0}
      render={(data) => (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.tags.map((t) => (
              <li key={t.name} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="font-mono text-xs text-slate-500">{t.commitSha.slice(0, 7)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    />
  );
}

function ReleasesTab({ owner, repo }: { owner: string; repo: string }) {
  const state = useApi<{ releases: ReleaseInfo[] }>(`/api/repos/${owner}/${repo}/releases`);
  return (
    <DataState
      state={state}
      empty={<p>No releases found.</p>}
      emptyCheck={(d) => d.releases.length === 0}
      render={(data) => (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.releases.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <div className="font-medium">{r.name ?? r.tagName}</div>
                  <div className="text-xs text-slate-500">{formatDate(r.publishedAt)}</div>
                </div>
                <div className="flex gap-1.5">
                  {r.draft ? <Badge tone="neutral">Draft</Badge> : null}
                  {r.prerelease ? <Badge tone="warning">Prerelease</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    />
  );
}

function StorageTab({ owner, repo }: { owner: string; repo: string }) {
  const state = useApi<{ files: LargeFileEntry[] }>(`/api/repos/${owner}/${repo}/large-files`);
  return (
    <DataState
      state={state}
      empty={<p>No unusually large files were detected.</p>}
      emptyCheck={(d) => d.files.length === 0}
      render={(data) => (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-1">File</th>
                <th className="py-1 text-right">Size</th>
                <th className="py-1">Risk</th>
              </tr>
            </thead>
            <tbody>
              {data.files.map((f) => (
                <tr key={f.path} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 font-mono text-xs">{f.path}</td>
                  <td className="py-1.5 text-right">{formatBytes(f.sizeBytes)}</td>
                  <td className="py-1.5">
                    <Badge tone={f.risk === "high" ? "error" : f.risk === "medium" ? "warning" : "neutral"}>
                      {f.risk}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    />
  );
}

function CleanupTab({ owner, repo, branch }: { owner: string; repo: string; branch: string }) {
  const router = useRouter();
  const [selectedBranch] = useState(branch);
  return (
    <Card className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Select commits from the Commits tab or the global Commits page, then open the cleanup wizard to
        review a safe, previewed history-rewrite plan.
      </p>
      <Button
        variant="danger"
        onClick={() =>
          router.push(`/cleanup?repo=${owner}/${repo}&branch=${encodeURIComponent(selectedBranch)}`)
        }
      >
        Open Cleanup Wizard
      </Button>
    </Card>
  );
}
