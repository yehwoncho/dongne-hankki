import { NextRequest, NextResponse } from "next/server";
import { districtSlugToName } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";
import { findDistrictRestaurantById } from "@/lib/kakao-district";

// ⚠️ 카카오 전환(WIRE_DETAIL_PAGE.md): 카카오 로컬 API엔 "id로 상세 조회"가 없어서,
// ?sido=&sigungu= 슬러그를 같이 받아 목록 조회 때 캐시된 45건 안에서 id로 찾는다.
// 캐시 히트면(직전에 같은 구 목록을 조회한 경우) 카카오 재호출이 없다.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sidoSlug = req.nextUrl.searchParams.get("sido");
  const sigunguSlug = req.nextUrl.searchParams.get("sigungu");

  if (!sidoSlug || !sigunguSlug) {
    return NextResponse.json(
      { error: { code: "MISSING_DISTRICT", message: "sido/sigungu 쿼리 파라미터가 필요합니다." } },
      { status: 400 }
    );
  }

  const sido = sidoBySlug(sidoSlug);
  const sigunguName = sido ? districtSlugToName(sido, sigunguSlug) : null;
  if (!sido || !sigunguName) {
    return NextResponse.json(
      { error: { code: "MISSING_DISTRICT", message: "지역을 확인할 수 없습니다." } },
      { status: 400 }
    );
  }

  const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
  const restaurant = await findDistrictRestaurantById(sido, sigunguName, id, apiKey);
  if (!restaurant) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "식당을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  return NextResponse.json(restaurant, {
    // kakao-district.ts의 서버 캐시가 10분 TTL이라 그보다 길게 잡지 않는다
    // (mock 시절엔 24시간 s-maxage였지만, 이제 살아있는 데이터라 그만큼 오래 캐시하면 안 됨).
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60" },
  });
}
