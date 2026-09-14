import { NextResponse } from "next/server";
import { store } from "@/lib/store/memory-store";

export async function GET() {
  const backups = await store.listBackups();
  return NextResponse.json({ backups });
}
