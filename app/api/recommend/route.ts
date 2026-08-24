import { NextResponse } from "next/server";
import { geohashEncode } from "@/lib/geohash";
import { fetchRecommendation } from "@/lib/kakao-recommend";
import type { KakaoNearbyItem } from "@/lib/types";

// "나를 위한 추천" 프록시 — 카카오 REST 키는 이 파일에서만 쓰인다(클라이언트 미노출).
// app/api/nearby/route.ts와 같은 구조(geohash 버킷 캐시, 3초 타임아웃)를 그대로 따르되,
// 검색 관련 기존 라우트/파일은 건드리지 않기 위해 완전히 별도 라우트로 뒀다.
const CACHE_TTL_MS = 60_000;
const RADIUS = 3000; // "내 주변"(500~2000m)보다 넓게 — 발견 성격의 추천이라 반경을 더 준다.
const cache = new Map<string, { expiresAt: number; data: { items: KakaoNearbyItem[] } }>();

// lib/category.ts의 CATEGORY_LABELS 값과 정확히 일치해야만 통과시킨다 — 임의 문자열을
// 그대로 카카오 쿼리에 흘려보내지 않기 위한 화이트리스트.
const VALID_LABELS = new Set([
  "한식", "중식", "일식", "양식", "아시안·기타", "분식", "카페·디저트", "술집", "기타",
]);

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const category = p.get("category") ?? "";
  const lat = Number(p.get("y"));
  const lng = Number(p.get("x"));

  if (!VALID_LABELS.has(category)) {
    return NextResponse.json(
      { error: { code: "INVALID_CATEGORY", message: "카테고리가 올바르지 않습니다" } },
      { status: 400 }
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return NextResponse.json(
      { error: { code: "INVALID_COORDS", message: "좌표가 올바르지 않습니다" } },
      { status: 400 }
    );
  }

  const bucket = geohashEncode(lat, lng, 6); // 좌표 그대로 캐시하지 않는다 (기존 /api/nearby와 동일 원칙)
  const cacheKey = `${category}:${bucket}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, { headers: { "Cache-Control": "public, max-age=60" } });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const items = await fetchRecommendation(
      { categoryLabel: category, lat, lng, radius: RADIUS },
      controller.signal
    );
    clearTimeout(timeout);

    const result = { items };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });

    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json(
      { error: { code: "KAKAO_ERROR", message: "지금은 추천 정보를 불러올 수 없습니다" } },
      { status: 502 }
    );
  }
}
