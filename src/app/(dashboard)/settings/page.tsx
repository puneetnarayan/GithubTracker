"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/use-api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { RateLimitInfo } from "@/types";

interface Prefs {
  autoRefresh: boolean;
  warnOnMergeCommits: boolean;
}

const DEFAULT_PREFS: Prefs = { autoRefresh: false, warnOnMergeCommits: true };
const PREFS_KEY = "app-preferences";

export default function SettingsPage() {
  const rateLimitState = useApi<RateLimitInfo>("/api/rate-limit");
  const [mockMode, setMockMode] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setMockMode(Boolean(data.mockMode)))
      .catch(() => null);
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      // Ignore — defaults already applied.
    }
  }, []);

  function updatePrefs(next: Partial<Prefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
    } catch {
      // Non-critical preference persistence — ignore failures.
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Settings</h1>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">GitHub Connection</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Status</span>
            {mockMode ? <Badge tone="warning">Demo mode (no live connection)</Badge> : <Badge tone="success">Connected</Badge>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access tokens are never displayed here or stored in the browser. Reconnect via GitHub OAuth if
            your session expires.
          </p>
          {!mockMode ? (
            <div className="flex gap-2 pt-1">
              {/* eslint-disable @next/next/no-html-link-for-pages -- full navigation to route handlers, not pages */}
              <a href="/api/auth/signin" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                Reconnect
              </a>
              <a href="/api/auth/signout" className="text-sm text-red-600 hover:underline dark:text-red-400">
                Disconnect
              </a>
              {/* eslint-enable @next/next/no-html-link-for-pages */}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">API Rate Limit</h2>
        {rateLimitState.status === "success" ? (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Remaining</div>
              <div className="font-semibold">
                {rateLimitState.data.remaining} / {rateLimitState.data.limit}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Used</div>
              <div className="font-semibold">{rateLimitState.data.used}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Resets</div>
              <div className="font-semibold">{new Date(rateLimitState.data.resetAt).toLocaleTimeString()}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Data Refresh</h2>
        <div className="flex items-center justify-between text-sm">
          <span>Auto-refresh dashboard data</span>
          <input
            type="checkbox"
            checked={prefs.autoRefresh}
            onChange={(e) => updatePrefs({ autoRefresh: e.target.checked })}
          />
        </div>
        <div className="mt-3">
          <Button
            variant="secondary"
            onClick={() => fetch("/api/repos", { method: "POST" }).then(() => window.location.reload())}
          >
            Refresh all repositories now
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold">Safety</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          The core protections below are always enforced by the cleanup wizard and cannot be disabled from
          here — there is no setting that turns off preview, backup, or typed confirmation requirements.
        </p>
        <ul className="space-y-2 text-sm">
          {[
            "Require preview before history rewrite",
            "Require backup before rewrite",
            "Require typed confirmation (REWRITE HISTORY)",
            "Warn on default branch",
            "Warn on protected branch",
            "Verify remote state after operation",
          ].map((label) => (
            <li key={label} className="flex items-center justify-between">
              <span>{label}</span>
              <input type="checkbox" checked disabled aria-label={`${label} (always enabled)`} />
            </li>
          ))}
          <li className="flex items-center justify-between">
            <span>Warn on merge commits</span>
            <input
              type="checkbox"
              checked={prefs.warnOnMergeCommits}
              onChange={(e) => updatePrefs({ warnOnMergeCommits: e.target.checked })}
            />
          </li>
        </ul>
      </section>
    </div>
  );
}
