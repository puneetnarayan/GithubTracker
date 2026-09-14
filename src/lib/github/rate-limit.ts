import type { Octokit } from "octokit";
import type { RateLimitInfo } from "@/types";
import { isMockMode } from "@/lib/config";
import { mockRateLimit } from "@/lib/github/mock-data";

export async function getRateLimit(octokit: Octokit): Promise<RateLimitInfo> {
  if (isMockMode()) return mockRateLimit();
  const { data } = await octokit.rest.rateLimit.get();
  const core = data.resources.core;
  return {
    limit: core.limit,
    remaining: core.remaining,
    used: core.used,
    resetAt: new Date(core.reset * 1000).toISOString(),
  };
}
