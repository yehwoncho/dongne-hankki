import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceReviewsCached } from "@/lib/google-reviews";
import { analyzeReviewsCached } from "@/lib/gemini-review-analysis";

// 제미나이 리뷰 감성 분석 프록시 — app/api/review-summary/route.ts와 동일한 구조.
// id/name/address로 fetchPlaceReviewsCached()를 재사용해 리뷰를 얻는다(새 함수 아님,
// 이미 24시간 캐시돼 있어 리뷰 패널이 방금 부른 직후라면 구글에 재요청 없음).
// "몇 %가 긍정이냐"는 제미나이에게 묻지 않는다 — 감성 라벨만 받고, 집계는
// lib/gemini-review-analysis.ts가 코드로 직접 계산한다.
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
    // 리뷰 0건이면 호출부(ReviewAnalysisPanel)가 애초에 이 라우트를 안 부르지만,
    // 직접 호출 등 방어적으로 여기서도 한 번 더 막는다.
    const reviewResult = await fetchPlaceReviewsCached(id, name, address, placesKey);
    if (!reviewResult || reviewResult.reviews.length === 0) {
      return NextResponse.json(
        { available: false },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    const analysis = await analyzeReviewsCached(id, reviewResult.reviews, geminiKey);
    if (!analysis) {
      return NextResponse.json(
        { available: false },
        { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
      );
    }

    return NextResponse.json(
      { available: true, ...analysis },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json(
      { error: { code: "ANALYSIS_FETCH_FAILED", message: "AI 감성 분석을 불러오지 못했습니다." } },
      { status: 502 }
    );
  }
}
