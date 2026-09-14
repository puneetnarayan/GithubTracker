"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("theme") : null;
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // Ignore storage failures (private browsing, etc.) — theme still
      // applies for this page view via the class toggle above.
    }
  };

  return { theme, toggle };
}

export function Topbar({ mockMode, userLabel }: { mockMode: boolean; userLabel: string | null }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
      <div className="hidden min-w-0 flex-1 md:block">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {mockMode ? <Badge tone="warning">DEMO DATA</Badge> : null}
        <button
          type="button"
          aria-label="Toggle dark mode"
          onClick={toggle}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {userLabel ? (
          <div className="flex items-center gap-2 pl-1 text-sm text-slate-700 dark:text-slate-300">
            <span className="hidden sm:inline">{userLabel}</span>
            {!mockMode ? (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- full navigation to a route handler, not a page
              <a
                href="/api/auth/signout"
                aria-label="Sign out"
                className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
