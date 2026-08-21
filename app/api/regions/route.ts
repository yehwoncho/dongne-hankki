import { NextResponse } from "next/server";
import { getRegions } from "@/lib/db";

export async function GET() {
  const regions = getRegions();
  return NextResponse.json(regions, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
