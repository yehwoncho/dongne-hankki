import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceReviewsCached } from "@/lib/google-reviews";
import { summarizeReviewsCached } from "@/lib/gemini-review-summary";

// 제미나이(Gemini) 리뷰 요약 프록시. 상세 페이지의 ReviewPanel이 구글 리뷰를 성공적으로
// 불러온 뒤에만 부른다(app/api/reviews/route.ts와 같은 id/name/address 쿼리를 그대로 재사용).
// 리뷰 자체는 fetchPlaceReviewsCached()로 다시 가져온다 — 새 함수 아님, 이미 24시간 캐시돼
// 있어 리뷰 패널이 방금 부른 직후라면 구글에 재요청 없이 캐시 히트한다.
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

  const placesKey = process.env.GOOGLE_PLACES_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!placesKey || !geminiKey) {
    return NextResponse.json(
      { error: { code: "NO_API_KEY", message: "GOOGLE_PLACES_KEY/GEMINI_API_KEY가 설정되지 않았습니다." } },
      { status: 500 }
    );
  }

  try {
    const reviewResult = await fetchPlaceReviewsCached(id, name, address, placesKey);
    if (!reviewResult || reviewResult.reviews.length === 0) {
      // 매칭되는 장소가 없거나 리뷰가 0개 — 요약할 게 없음, 에러 아님
      return NextResponse.json(
        { available: false },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    const summary = await summarizeReviewsCached(id, name, reviewResult.reviews, geminiKey);
    if (!summary) {
      return NextResponse.json(
        { available: false },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    return NextResponse.json(
      { available: true, summary },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { error: { code: "SUMMARY_FETCH_FAILED", message: "AI 요약을 불러오지 못했습니다." } },
      { status: 502 }
    );
  }
}
