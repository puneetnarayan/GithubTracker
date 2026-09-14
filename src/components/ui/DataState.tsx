import { AlertTriangle, Loader2 } from "lucide-react";
import type { ApiState } from "@/lib/use-api";

export function DataState<T>({
  state,
  empty,
  render,
  emptyCheck,
}: {
  state: ApiState<T>;
  empty: React.ReactNode;
  render: (data: T) => React.ReactNode;
  emptyCheck?: (data: T) => boolean;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 py-10 text-center text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        <AlertTriangle className="h-5 w-5" />
        {state.message}
      </div>
    );
  }
  if (emptyCheck?.(state.data)) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
        {empty}
      </div>
    );
  }
  return <>{render(state.data)}</>;
}
