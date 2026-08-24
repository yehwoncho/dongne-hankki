/**
 * 구글 Places API(New) `places:searchText`로 별점·리뷰를 가져오는 모듈.
 *
 * 카카오 로컬 API에는 별점/리뷰가 없어서, 상세 페이지(app/restaurant/[id]/page.tsx)의
 * 리뷰 패널이 이 모듈을 통해 구글 쪽 정보를 별도로 받아온다.
 *
 * 구글엔 "우리가 아는 place id로 상세 조회"할 방법이 없다(카카오 id는 구글 id가 아님) —
 * 대신 가게 이름+주소 텍스트로 searchText를 돌려 가장 가까운 결과 하나를 쓴다.
 *
 * 캐시 구조는 lib/kakao-district.ts의 resultCache/inFlight 패턴을 그대로 재사용한다:
 * 같은 가게를 다시 조회해도(카드 재클릭 등) 구글을 다시 호출하지 않는다.
 */

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

/** 검색 결과에서 쓸 필드만 요청 — 결제/쿼터 절약 (Places API New는 필드마다 과금 등급이 다르다) */
const FIELD_MASK = "places.rating,places.userRatingCount,places.reviews";

export interface GoogleReview {
  authorName: string;
  rating: number;
  relativeTime: string; // 구글이 주는 그대로("2주 전" 등) — 우리가 직접 계산하지 않는다
  text: string;
}

export interface PlaceReviewsResult {
  rating: number;
  userRatingCount: number;
  reviews: GoogleReview[]; // 최대 5개 (Places API New 자체가 이 필드에 최대 5개까지만 준다)
}

interface RawGooglePlace {
  rating?: number;
  userRatingCount?: number;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    authorAttribution?: { displayName?: string };
  }[];
}

function toResult(place: RawGooglePlace): PlaceReviewsResult {
  const reviews: GoogleReview[] = (place.reviews ?? []).slice(0, 5).map((r) => ({
    authorName: r.authorAttribution?.displayName ?? "익명",
    rating: r.rating ?? 0,
    relativeTime: r.relativePublishTimeDescription ?? "",
    text: r.text?.text ?? "",
  }));

  return {
    rating: place.rating ?? 0,
    userRatingCount: place.userRatingCount ?? 0,
    reviews,
  };
}

/**
 * 실호출 — 이름+주소 텍스트 검색으로 가장 근접한 장소 하나를 찾는다.
 * 구글에 매칭되는 장소가 없으면(정상 케이스) null. 키 오류·쿼터 초과 등은 throw.
 */
async function searchPlaceReviews(
  name: string,
  address: string,
  apiKey: string
): Promise<PlaceReviewsResult | null> {
  const res = await fetch(SEARCH_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${name} ${address}`,
      languageCode: "ko",
    }),
  });

  if (!res.ok) {
    throw new Error(`google places ${res.status}`);
  }

  const data = (await res.json()) as { places?: RawGooglePlace[] };
  const place = data.places?.[0];
  if (!place) return null; // 매칭되는 장소 없음 — 에러 아님

  return toResult(place);
}

// ── 짧은 서버 캐시 — 같은 가게를 다시 조회해도 구글을 다시 안 부른다 ──
// (lib/kakao-district.ts의 resultCache/inFlight와 동일한 패턴)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간 — 리뷰는 지역 목록(10분)보다 훨씬 안정적

const resultCache = new Map<
  string,
  { value: PlaceReviewsResult | null; expiresAt: number }
>();
const inFlight = new Map<string, Promise<PlaceReviewsResult | null>>();

/**
 * 상세 페이지용 진입점. id(카카오 place id 등 우리 쪽 고유값)로 캐시하고,
 * 동시 요청은 in-flight dedupe로 구글 호출을 1번만 내보낸다.
 */
export async function fetchPlaceReviewsCached(
  id: string,
  name: string,
  address: string,
  apiKey: string
): Promise<PlaceReviewsResult | null> {
  const cached = resultCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inFlight.get(id);
  if (pending) return pending;

  const request = (async () => {
    const result = await searchPlaceReviews(name, address, apiKey);
    resultCache.set(id, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  })();

  inFlight.set(id, request);
  try {
    return await request;
  } finally {
    inFlight.delete(id);
  }
}
