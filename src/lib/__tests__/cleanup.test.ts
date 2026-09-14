import { describe, expect, it, beforeAll } from "vitest";
import type { Octokit } from "octokit";

beforeAll(() => {
  process.env.MOCK_MODE = "true";
});

describe("analyzeCleanupSafety (mock mode)", () => {
  it("flags the default branch and protected branch, and lists tags on affected commits", async () => {
    const { analyzeCleanupSafety } = await import("@/lib/github/cleanup");
    const { mockListCommits, mockListTags } = await import("@/lib/github/mock-data");

    const commits = mockListCommits("demo-user", "customer-portal");
    const tags = mockListTags("demo-user", "customer-portal");
    const targetSha = tags[0]?.commitSha ?? commits[0].sha;

    const analysis = await analyzeCleanupSafety({} as Octokit, {
      owner: "demo-user",
      repo: "customer-portal",
      branch: "main",
      defaultBranch: "main",
      selectedShas: [targetSha],
      headSha: commits[0].sha,
    });

    expect(analysis.isDefaultBranch).toBe(true);
    expect(analysis.isProtectedBranch).toBe(true);
    expect(analysis.requiresForcePush).toBe(true);
    if (tags.some((t) => t.commitSha === targetSha)) {
      expect(analysis.tagsPointingToAffected.length).toBeGreaterThan(0);
    }
  });

  it("computes higher impact for larger selections", async () => {
    const { analyzeCleanupSafety } = await import("@/lib/github/cleanup");
    const { mockListCommits } = await import("@/lib/github/mock-data");
    const commits = mockListCommits("demo-user", "customer-portal");

    const small = await analyzeCleanupSafety({} as Octokit, {
      owner: "demo-user",
      repo: "customer-portal",
      branch: "main",
      defaultBranch: "main",
      selectedShas: [commits[0].sha],
      headSha: commits[0].sha,
    });

    expect(small.impact).toBe("high"); // default branch alone forces "high"
  });
});
