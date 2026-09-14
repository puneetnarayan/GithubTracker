import { NextResponse } from "next/server";
import { store } from "@/lib/store/memory-store";
import { requireAuthentication } from "@/lib/api-helpers";

export async function GET() {
  const denied = await requireAuthentication();
  if (denied) return denied;
  const backups = await store.listBackups();
  return NextResponse.json({ backups });
}
