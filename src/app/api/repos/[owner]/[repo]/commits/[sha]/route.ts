import { withOctokit } from "@/lib/api-helpers";
import { getCommit } from "@/lib/github/commits";
import { assertValidOwnerRepo, shaSchema, ValidationError } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; sha: string }> },
) {
  const { owner, repo, sha } = await params;
  assertValidOwnerRepo(owner, repo);
  if (!shaSchema.safeParse(sha).success) {
    throw new ValidationError("Invalid commit SHA");
  }

  return withOctokit(request, async (octokit) => {
    const commit = await getCommit(octokit, owner, repo, sha);
    if (!commit) {
      throw Object.assign(new Error("Commit not found"), { status: 404 });
    }
    return commit;
  });
}
