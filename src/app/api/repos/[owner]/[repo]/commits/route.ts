import { withOctokit } from "@/lib/api-helpers";
import { listCommits } from "@/lib/github/commits";
import { assertValidOwnerRepo, branchSchema } from "@/lib/validation";
import { ValidationError } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;
  assertValidOwnerRepo(owner, repo);

  const url = new URL(request.url);
  const branchParam = url.searchParams.get("branch") ?? undefined;
  if (branchParam) {
    const parsed = branchSchema.safeParse(branchParam);
    if (!parsed.success) throw new ValidationError("Invalid branch name");
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("perPage") ?? "50", 10) || 50));

  return withOctokit(request, (octokit) =>
    listCommits(octokit, owner, repo, {
      branch: branchParam,
      since: url.searchParams.get("since") ?? undefined,
      until: url.searchParams.get("until") ?? undefined,
      author: url.searchParams.get("author") ?? undefined,
      path: url.searchParams.get("path") ?? undefined,
      page,
      perPage,
    }),
  );
}
