"use client";

import { useState } from "react";
import { DataState } from "@/components/ui/DataState";
import { Badge } from "@/components/ui/Badge";
import { useApi } from "@/lib/use-api";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry, BackupRecord } from "@/types";

export default function BackupsPage() {
  const backupsState = useApi<{ backups: BackupRecord[] }>("/api/backups");
  const auditState = useApi<{ entries: AuditLogEntry[] }>("/api/audit");
  const [tab, setTab] = useState<"backups" | "audit">("backups");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Backups</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Backup references created before cleanup operations, and the full audit log of destructive-operation
          attempts. This application never restores history automatically — see restore instructions below.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {(["backups", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${
              tab === t
                ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                : "border-transparent text-slate-500"
            }`}
          >
            {t === "audit" ? "Audit log" : "Backups"}
          </button>
        ))}
      </div>

      {tab === "backups" ? (
        <DataState
          state={backupsState}
          empty={<p>No cleanup backups have been created.</p>}
          emptyCheck={(d) => d.backups.length === 0}
          render={(data) => (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Repository</th>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">Backup ref</th>
                    <th className="px-3 py-2">Original HEAD</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.backups.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{b.repoFullName}</td>
                      <td className="px-3 py-2">{b.branch}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.ref}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.originalHeadSha.slice(0, 7)}</td>
                      <td className="px-3 py-2">{formatDateTime(b.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={b.status === "created" ? "success" : "warning"}>{b.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <a
                          href={`https://github.com/${b.repoFullName}/tree/${b.ref}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          View on GitHub
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <strong>Restore instructions:</strong> a backup ref points at the branch&apos;s state before
                cleanup. To restore, fetch the ref locally (<code>git fetch origin refs/heads/&lt;ref&gt;</code>)
                and force-push it back onto the target branch after review — this is itself a history rewrite
                and must go through the same review, backup, and confirmation steps as any other cleanup
                operation. This application does not perform that restoration automatically.
              </div>
            </div>
          )}
        />
      ) : (
        <DataState
          state={auditState}
          empty={<p>No destructive operations have been attempted yet.</p>}
          emptyCheck={(d) => d.entries.length === 0}
          render={(data) => (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Repository</th>
                    <th className="px-3 py-2">Operation</th>
                    <th className="px-3 py-2 text-right">Selected</th>
                    <th className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => (
                    <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{formatDateTime(e.timestamp)}</td>
                      <td className="px-3 py-2">{e.user}</td>
                      <td className="px-3 py-2">
                        {e.repoFullName} ({e.branch})
                      </td>
                      <td className="px-3 py-2">{e.operation}</td>
                      <td className="px-3 py-2 text-right">{e.selectedShaCount}</td>
                      <td className="px-3 py-2">
                        <Badge tone={e.result === "success" ? "success" : e.result === "failed" ? "error" : "neutral"}>
                          {e.result}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        />
      )}
    </div>
  );
}
