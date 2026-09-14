import { NextResponse } from "next/server";
import { store } from "@/lib/store/memory-store";

export async function GET() {
  const entries = await store.listAuditEntries();
  return NextResponse.json({ entries });
}
