import { NextResponse } from "next/server";
import { getRegionsForSido } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sido: string }> }
) {
  const { sido: sidoSlug } = await params;
  const sido = sidoBySlug(sidoSlug);
  if (!sido) {
    // PRD §6 F1 수용기준: 잘못된 슬러그는 400이 아니라 빈 배열로 — 호출부(페이지)에서 폴백 처리
    return NextResponse.json([], { status: 200 });
  }
  const regions = getRegionsForSido(sido);
  return NextResponse.json(regions, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
