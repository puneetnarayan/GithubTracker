"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

/**
 * Small client-side data fetching hook (no external dependency) that
 * exposes loading/error/success states so every page can render the
 * loading/empty/error states required throughout the spec.
 */
export function useApi<T>(url: string | null, deps: unknown[] = []): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState({ status: "loading" });
    fetch(url)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? `Request failed (${res.status})` });
          return;
        }
        setState({ status: "success", data: body as T });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message || "Network error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);

  return { ...state, refetch };
}
