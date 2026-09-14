"use client";

import { useCallback, useEffect, useState } from "react";

export interface CommitSelectionState {
  repoFullName: string;
  branch: string;
  shas: string[];
}

const STORAGE_KEY = "commit-selection";

function readStorage(): CommitSelectionState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CommitSelectionState) : null;
  } catch {
    return null;
  }
}

function writeStorage(state: CommitSelectionState | null) {
  try {
    if (state) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort only — selection still works for the current render via
    // component state even if sessionStorage is unavailable.
  }
}

/**
 * Commit multi-selection, scoped to exactly one repository + branch at a
 * time. Selecting a commit in a different repo/branch clears the previous
 * selection rather than mixing SHAs from unrelated histories — cleanup
 * operations must never operate across repositories.
 */
export function useCommitSelection(repoFullName: string, branch: string) {
  const [selection, setSelection] = useState<CommitSelectionState | null>(null);

  useEffect(() => {
    const existing = readStorage();
    if (existing && existing.repoFullName === repoFullName && existing.branch === branch) {
      setSelection(existing);
    } else {
      setSelection({ repoFullName, branch, shas: [] });
    }
  }, [repoFullName, branch]);

  const update = useCallback(
    (shas: string[]) => {
      const next = { repoFullName, branch, shas };
      setSelection(next);
      writeStorage(shas.length > 0 ? next : null);
    },
    [repoFullName, branch],
  );

  const toggle = useCallback(
    (sha: string) => {
      const current = selection?.shas ?? [];
      const next = current.includes(sha) ? current.filter((s) => s !== sha) : [...current, sha];
      update(next);
    },
    [selection, update],
  );

  const selectMany = useCallback((shas: string[]) => update(Array.from(new Set(shas))), [update]);
  const clear = useCallback(() => update([]), [update]);

  return {
    shas: selection?.shas ?? [],
    toggle,
    selectMany,
    clear,
    isSelected: (sha: string) => (selection?.shas ?? []).includes(sha),
  };
}
