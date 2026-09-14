export interface RepoSummary {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  defaultBranch: string;
  sizeKb: number;
  htmlUrl: string;
  description: string | null;
  updatedAt: string;
  pushedAt: string;
  openIssuesCount: number;
  language: string | null;
  // Enriched, cached fields (not part of the raw GitHub repo object).
  commitCount?: number;
  commitCountIsEstimate?: boolean;
  branchCount?: number;
  tagCount?: number;
  lastCommitSha?: string;
  lastCommitDate?: string;
}

export interface CommitSummary {
  sha: string;
  shortSha: string;
  message: string;
  messageHeadline: string;
  authorName: string;
  authorLogin: string | null;
  authorDate: string;
  committerName: string;
  committerDate: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  isMerge: boolean;
  parents: string[];
  htmlUrl: string;
}

export interface CommitDetail extends CommitSummary {
  files: Array<{
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    status: string;
  }>;
}

export interface BranchInfo {
  name: string;
  commitSha: string;
  protected: boolean;
  isDefault: boolean;
  ahead?: number;
  behind?: number;
}

export interface TagInfo {
  name: string;
  commitSha: string;
  type: "annotated" | "lightweight";
}

export interface ReleaseInfo {
  id: number;
  name: string | null;
  tagName: string;
  publishedAt: string | null;
  draft: boolean;
  prerelease: boolean;
  htmlUrl: string;
}

export interface LargeFileEntry {
  path: string;
  sizeBytes: number;
  lastChangedSha: string | null;
  lastChangedDate: string | null;
  risk: "low" | "medium" | "high";
  reason: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  used: number;
  resetAt: string;
}

export interface BackupRecord {
  id: string;
  repoFullName: string;
  branch: string;
  ref: string;
  originalHeadSha: string;
  createdAt: string;
  createdBy: string;
  operation: string;
  selectedShas: string[];
  status: "created" | "reference-unavailable" | "manual-plan-only";
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  repoFullName: string;
  branch: string;
  operation: string;
  selectedShaCount: number;
  originalHeadSha: string;
  backupRef: string | null;
  newHeadSha: string | null;
  result: "success" | "failed" | "plan-generated";
  error: string | null;
}

export interface CleanupSafetyAnalysis {
  isProtectedBranch: boolean;
  isDefaultBranch: boolean;
  allSelectedAreAncestorsOfHead: boolean;
  containsMergeCommits: boolean;
  hasCommitsAfterSelection: boolean;
  tagsPointingToAffected: string[];
  branchesPointingToAffected: string[];
  requiresForcePush: boolean;
  hasSufficientPermission: boolean;
  warnings: string[];
  impact: "low" | "medium" | "high";
}
