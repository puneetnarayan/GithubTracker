"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface SearchResultGroup {
  type: string;
  label: string;
  items: Array<{ id: string; title: string; subtitle: string; href: string }>;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.groups ?? []);
        setOpen(true);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative max-w-md">
      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search repositories, commits, branches..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-label="Global search"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {open && results.length > 0 ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {results.map((group) => (
            <div key={group.type} className="mb-2">
              <div className="px-2 text-xs font-semibold text-slate-500 uppercase dark:text-slate-400">
                {group.label}
              </div>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="block rounded px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                </a>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
