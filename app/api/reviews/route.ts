import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceReviewsCached } from "@/lib/google-reviews";

// 구글 Places API(New)로 별점·리뷰를 가져오는 프록시. 상세 페이지의 ReviewPanel이
// 부른다. id는 우리 쪽 고유값(카카오 place id) — 캐시 키로만 쓰고 구글엔 이름+주소로
// 텍스트 검색한다(lib/google-reviews.ts 참고).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const id = p.get("id");
  const name = p.get("name");
  const address = p.get("address") ?? "";

  if (!id || !name) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAMS", message: "id/name 쿼리 파라미터가 필요합니다." } },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "NO_API_KEY", message: "GOOGLE_PLACES_KEY가 설정되지 않았습니다." } },
      { status: 500 }
    );
  }

  try {
    const result = await fetchPlaceReviewsCached(id, name, address, apiKey);

    if (!result) {
      // 구글에 매칭되는 장소가 없음 — 에러가 아니라 "리뷰 없음" 상태로 클라이언트가 처리
      return NextResponse.json(
        { found: false },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    return NextResponse.json(
      { found: true, ...result },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { error: { code: "REVIEWS_FETCH_FAILED", message: "리뷰를 불러오지 못했습니다." } },
      { status: 502 }
    );
  }
}
