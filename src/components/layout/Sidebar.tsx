"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  FolderGit2,
  GitCommitHorizontal,
  HardDrive,
  GitBranch,
  Tags,
  Wrench,
  Activity,
  Archive,
  Settings,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: FolderGit2 },
  { href: "/commits", label: "Commits", icon: GitCommitHorizontal },
  { href: "/storage", label: "Storage", icon: HardDrive },
  { href: "/branches", label: "Branches", icon: GitBranch },
  { href: "/tags-releases", label: "Tags & Releases", icon: Tags },
  { href: "/cleanup", label: "Cleanup", icon: Wrench },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/backups", label: "Backups", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">GitHub Manager</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Repositories • Storage • Commits • Cleanup
          </div>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          className="rounded p-1 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
          onClick={onNavigate}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={clsx(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
