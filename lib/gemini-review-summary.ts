/**
 * 제미나이(Gemini)로 구글 리뷰를 요약하는 모듈.
 *
 * lib/google-reviews.ts가 이미 가져온 리뷰(최대 5개, 별점·본문)를 받아 한국어 1~2문장
 * 요약을 만든다. 별도로 리뷰를 다시 가져오지 않는다 — 호출부(app/api/review-summary/route.ts)가
 * fetchPlaceReviewsCached()로 얻은 결과를 그대로 넘긴다.
 *
 * 캐시 구조는 lib/google-reviews.ts의 resultCache/inFlight 패턴을 그대로 재사용한다:
 * 같은 가게를 다시 조회해도(카드 재클릭 등) 제미나이를 다시 호출하지 않는다.
 */

import { GEMINI_FLASH_MODEL } from "./constants/models";
import type { GoogleReview } from "./google-reviews";

const GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent`;

function buildPrompt(placeName: string, reviews: GoogleReview[]): string {
  const reviewLines = reviews
    .map((r, i) => `${i + 1}. (별점 ${r.rating}/5) ${r.text || "(본문 없음)"}`)
    .join("\n");

  return [
    `다음은 "${placeName}"이라는 식당의 구글 리뷰 ${reviews.length}개다.`,
    reviewLines,
    "",
    "이 리뷰들을 바탕으로 방문 전 손님이 참고할 수 있게 한국어로 1~2문장, 담백한 어조로",
    "요약해줘. 공통적으로 언급되는 장점과(있다면) 단점을 균형 있게 담고, 과장하거나",
    "광고처럼 쓰지 마. 다른 설명 없이 요약 문장만 출력해.",
  ].join("\n");
}

/**
 * 실호출 — Gemini generateContent. 리뷰 텍스트가 하나도 없으면 호출하지 않고 null.
 * 키 오류·쿼터 초과 등은 throw(호출부가 error 상태로 처리).
 */
async function summarizeReviews(
  placeName: string,
  reviews: GoogleReview[],
  apiKey: string
): Promise<string | null> {
  if (reviews.length === 0) return null;

  const res = await fetch(GENERATE_CONTENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(placeName, reviews) }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`gemini generateContent ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

// ── 짧은 서버 캐시 — 같은 가게를 다시 조회해도 제미나이를 다시 안 부른다 ──
// (lib/google-reviews.ts의 resultCache/inFlight와 동일한 패턴)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간 — 리뷰 캐시(lib/google-reviews.ts)와 동일 주기

const resultCache = new Map<string, { value: string | null; expiresAt: number }>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * 상세 페이지 API 라우트용 진입점. id(카카오 place id 등 우리 쪽 고유값)로 캐시하고,
 * 동시 요청은 in-flight dedupe로 제미나이 호출을 1번만 내보낸다.
 */
export async function summarizeReviewsCached(
  id: string,
  placeName: string,
  reviews: GoogleReview[],
  apiKey: string
): Promise<string | null> {
  const cached = resultCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inFlight.get(id);
  if (pending) return pending;

  const request = (async () => {
    const result = await summarizeReviews(placeName, reviews, apiKey);
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
