import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isMockMode } from "@/lib/config";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const mockMode = isMockMode();
  const session = mockMode ? null : await auth();

  if (!mockMode && !session) {
    redirect("/login");
  }

  const userLabel = mockMode ? "Demo User" : session?.user?.name ?? session?.user?.email ?? null;

  return (
    <AppShell mockMode={mockMode} userLabel={userLabel}>
      {children}
    </AppShell>
  );
}
