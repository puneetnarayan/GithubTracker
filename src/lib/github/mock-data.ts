import type {
  BackupRecord,
  BranchInfo,
  CommitDetail,
  CommitSummary,
  LargeFileEntry,
  ReleaseInfo,
  RepoSummary,
  TagInfo,
} from "@/types";

// Deterministic pseudo-random generator so mock data is stable across
// requests within a single server process, without needing persistence.
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const AUTHORS = [
  { name: "Ava Chen", login: "avachen" },
  { name: "Marcus Reed", login: "mreed" },
  { name: "Priya Nair", login: "priyan" },
  { name: "Diego Alvarez", login: "dalvarez" },
  { name: "Grace Kim", login: "gracekim" },
  { name: "Claude Assistant", login: "claude-bot" },
];

const MESSAGE_TEMPLATES = [
  "Fix null pointer in {area} handler",
  "Update {area} dependencies",
  "Add feature: {area} export support",
  "Refactor {area} module for clarity",
  "Test coverage for {area}",
  "docs: clarify {area} setup instructions",
  "Merge branch 'feature/{area}' into main",
  "fix: resolve race condition in {area}",
  "chore: bump {area} package versions",
  "feature: introduce {area} pagination",
];

const AREAS = [
  "auth",
  "dashboard",
  "billing",
  "search",
  "storage",
  "notifications",
  "onboarding",
  "reporting",
  "cache",
  "api",
];

const REPO_NAMES = [
  "customer-portal",
  "internal-tools",
  "data-pipeline",
  "mobile-app",
  "design-system",
  "infra-scripts",
  "billing-service",
  "docs-site",
  "legacy-monolith",
  "analytics-dashboard",
  "notification-service",
  "auth-gateway",
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function sha(rng: () => number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 40; i++) out += chars[Math.floor(rng() * 16)];
  return out;
}

interface MockRepoBundle {
  repo: RepoSummary;
  commits: CommitSummary[];
  branches: BranchInfo[];
  tags: TagInfo[];
  releases: ReleaseInfo[];
  largeFiles: LargeFileEntry[];
}

const bundleCache = new Map<string, MockRepoBundle>();

function buildBundle(index: number): MockRepoBundle {
  const rng = seededRandom(1000 + index * 37);
  const name = REPO_NAMES[index % REPO_NAMES.length];
  const owner = "demo-user";
  const fullName = `${owner}/${name}`;
  const isPrivate = rng() > 0.55;
  const archived = rng() > 0.85;
  const fork = rng() > 0.9;
  const sizeKb = Math.floor(rng() * 500_000) + 500;
  const commitCount = Math.floor(rng() * 1200) + 20;
  const now = Date.now();
  const updatedAt = new Date(now - Math.floor(rng() * 60) * 86400000).toISOString();

  const commits: CommitSummary[] = [];
  const headSha = sha(rng);
  const branchNames = ["main", "develop", rng() > 0.5 ? "release/1.0" : "feature/redesign"];

  for (let i = 0; i < Math.min(commitCount, 400); i++) {
    const author = pick(rng, AUTHORS);
    const area = pick(rng, AREAS);
    const template = pick(rng, MESSAGE_TEMPLATES);
    const message = template.replace("{area}", area);
    const isMerge = message.startsWith("Merge") || rng() > 0.92;
    const commitDate = new Date(now - i * (86400000 / 3) - Math.floor(rng() * 3600000)).toISOString();
    const commitSha = i === 0 ? headSha : sha(rng);
    const parents = isMerge ? [sha(rng), sha(rng)] : i < commitCount - 1 ? [sha(rng)] : [];

    commits.push({
      sha: commitSha,
      shortSha: commitSha.slice(0, 7),
      message,
      messageHeadline: message.split("\n")[0],
      authorName: author.name,
      authorLogin: author.login,
      authorDate: commitDate,
      committerName: author.name,
      committerDate: commitDate,
      filesChanged: Math.floor(rng() * 15) + 1,
      additions: Math.floor(rng() * 400),
      deletions: Math.floor(rng() * 120),
      isMerge,
      parents,
      htmlUrl: `https://github.com/${fullName}/commit/${commitSha}`,
    });
  }

  const branches: BranchInfo[] = branchNames.map((b, bi) => ({
    name: b,
    commitSha: bi === 0 ? headSha : sha(rng),
    protected: b === "main",
    isDefault: b === "main",
    ahead: bi === 0 ? 0 : Math.floor(rng() * 20),
    behind: bi === 0 ? 0 : Math.floor(rng() * 10),
  }));

  const tags: TagInfo[] = Array.from({ length: Math.floor(rng() * 5) + 1 }, (_, ti) => ({
    name: `v${ti + 1}.${Math.floor(rng() * 9)}.0`,
    commitSha: sha(rng),
    type: rng() > 0.5 ? "annotated" : "lightweight",
  }));

  const releases: ReleaseInfo[] = tags.slice(0, Math.max(1, tags.length - 1)).map((t, ri) => ({
    id: ri + 1,
    name: `Release ${t.name}`,
    tagName: t.name,
    publishedAt: new Date(now - ri * 20 * 86400000).toISOString(),
    draft: false,
    prerelease: ri === 0 && rng() > 0.7,
    htmlUrl: `https://github.com/${fullName}/releases/tag/${t.name}`,
  }));

  const largeFileCandidates: Array<[string, number, LargeFileEntry["risk"], string]> = [
    ["dist/bundle.zip", 45_000_000, "high", "Archive committed instead of published as a release asset"],
    ["assets/promo-video.mp4", 120_000_000, "high", "Large binary media file in version control"],
    ["vendor/node_modules.tar", 80_000_000, "high", "Dependency archive accidentally committed"],
    ["docs/spec.pdf", 8_000_000, "medium", "Large document, consider external storage"],
    ["build/output.exe", 15_000_000, "medium", "Compiled binary checked into history"],
    ["images/hero-4k.png", 6_000_000, "low", "Large but plausibly legitimate design asset"],
  ];
  const largeFiles: LargeFileEntry[] = largeFileCandidates
    .filter(() => rng() > 0.5)
    .map(([path, size, risk, reason]) => ({
      path,
      sizeBytes: size,
      lastChangedSha: sha(rng).slice(0, 7),
      lastChangedDate: new Date(now - Math.floor(rng() * 200) * 86400000).toISOString(),
      risk,
      reason,
    }));

  const repo: RepoSummary = {
    id: index + 1,
    owner,
    name,
    fullName,
    private: isPrivate,
    archived,
    fork,
    defaultBranch: "main",
    sizeKb,
    htmlUrl: `https://github.com/${fullName}`,
    description: `Mock repository for ${name.replace(/-/g, " ")}.`,
    updatedAt,
    pushedAt: updatedAt,
    openIssuesCount: Math.floor(rng() * 25),
    language: pick(rng, ["TypeScript", "Python", "Go", "JavaScript", "Rust"]),
    commitCount,
    commitCountIsEstimate: commitCount > 400,
    branchCount: branches.length,
    tagCount: tags.length,
    lastCommitSha: headSha,
    lastCommitDate: commits[0]?.authorDate ?? updatedAt,
  };

  return { repo, commits, branches, tags, releases, largeFiles };
}

const REPO_COUNT = 12;

function getAllBundles(): MockRepoBundle[] {
  if (bundleCache.size === 0) {
    for (let i = 0; i < REPO_COUNT; i++) {
      const bundle = buildBundle(i);
      bundleCache.set(bundle.repo.fullName, bundle);
    }
  }
  return Array.from(bundleCache.values());
}

export function mockListRepos(): RepoSummary[] {
  return getAllBundles().map((b) => b.repo);
}

export function mockGetRepo(owner: string, name: string): RepoSummary | null {
  getAllBundles();
  return bundleCache.get(`${owner}/${name}`)?.repo ?? null;
}

export function mockListCommits(owner: string, name: string): CommitSummary[] {
  getAllBundles();
  return bundleCache.get(`${owner}/${name}`)?.commits ?? [];
}

export function mockGetCommit(owner: string, name: string, shaValue: string): CommitDetail | null {
  const commit = mockListCommits(owner, name).find(
    (c) => c.sha === shaValue || c.shortSha === shaValue,
  );
  if (!commit) return null;
  const rng = seededRandom(shaValue.length * 71);
  const files = Array.from({ length: commit.filesChanged ?? 3 }, (_, i) => ({
    filename: `src/${pick(rng, AREAS)}/file-${i}.ts`,
    additions: Math.floor(rng() * 100),
    deletions: Math.floor(rng() * 40),
    changes: 0,
    status: pick(rng, ["modified", "added", "removed"]),
  })).map((f) => ({ ...f, changes: f.additions + f.deletions }));
  return { ...commit, files };
}

export function mockListBranches(owner: string, name: string): BranchInfo[] {
  getAllBundles();
  return bundleCache.get(`${owner}/${name}`)?.branches ?? [];
}

export function mockListTags(owner: string, name: string): TagInfo[] {
  getAllBundles();
  return bundleCache.get(`${owner}/${name}`)?.tags ?? [];
}

export function mockListReleases(owner: string, name: string): ReleaseInfo[] {
  getAllBundles();
  return bundleCache.get(`${owner}/${name}`)?.releases ?? [];
}

export function mockListLargeFiles(owner: string, name: string): LargeFileEntry[] {
  getAllBundles();
  return bundleCache.get(`${owner}/${name}`)?.largeFiles ?? [];
}

export function mockRateLimit() {
  return {
    limit: 5000,
    remaining: 4230,
    used: 770,
    resetAt: new Date(Date.now() + 35 * 60000).toISOString(),
  };
}

const mockBackups: BackupRecord[] = [];
export function mockAddBackup(record: BackupRecord) {
  mockBackups.unshift(record);
  return record;
}
export function mockListBackups(): BackupRecord[] {
  return mockBackups;
}
