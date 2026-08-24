import { NextResponse } from "next/server";
import { getMeta } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await getMeta(), {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
