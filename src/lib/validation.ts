import { z } from "zod";

// GitHub owner/repo names: letters, digits, hyphens, underscores, dots.
// Deliberately strict so these values can never be used to build shell
// commands or file paths unsafely.
const SEGMENT_RE = /^[A-Za-z0-9_.-]{1,100}$/;

export const ownerSchema = z.string().regex(SEGMENT_RE, "Invalid owner name");
export const repoSchema = z.string().regex(SEGMENT_RE, "Invalid repository name");

// Branch names allow slashes (e.g. feature/foo) but no path traversal,
// whitespace, or shell metacharacters.
const BRANCH_RE = /^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9_./-]{1,255}(?<!\/)(?<!\.lock)$/;
export const branchSchema = z.string().regex(BRANCH_RE, "Invalid branch name");

const SHA_RE = /^[a-f0-9]{7,40}$/i;
export const shaSchema = z.string().regex(SHA_RE, "Invalid commit SHA");

export function assertValidOwnerRepo(owner: string, repo: string) {
  const o = ownerSchema.safeParse(owner);
  const r = repoSchema.safeParse(repo);
  if (!o.success || !r.success) {
    throw new ValidationError("Invalid repository identifier");
  }
}

export class ValidationError extends Error {}

export const cleanupRequestSchema = z.object({
  owner: ownerSchema,
  repo: repoSchema,
  branch: branchSchema,
  selectedShas: z.array(shaSchema).min(1).max(5000),
});
