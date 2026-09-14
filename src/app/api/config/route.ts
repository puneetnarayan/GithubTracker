import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/config";

// Exposes only non-secret runtime flags. Never add credentials here.
export async function GET() {
  return NextResponse.json({ mockMode: isMockMode() });
}
