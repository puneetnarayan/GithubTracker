import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { isMockMode } from "@/lib/config";

export default async function LoginPage() {
  if (isMockMode()) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">GitHub Manager</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Repositories • Storage • Commits • Cleanup
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Sign in with GitHub
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-400">
          Requests read-only access to your repositories (scopes: read:user, repo).
        </p>
      </div>
    </div>
  );
}
