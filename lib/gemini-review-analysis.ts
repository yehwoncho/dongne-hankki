/**
 * 제미나이(Gemini)로 구글 리뷰의 감성(긍정/중립/부정)을 분류하고 핵심 단어를 뽑는 모듈.
 *
 * lib/gemini-review-summary.ts와 같은 원칙: 리뷰는 다시 가져오지 않는다 — 호출부
 * (app/api/review-analysis/route.ts)가 fetchPlaceReviewsCached()로 얻은 결과를 그대로
 * 넘긴다.
 *
 * "몇 %가 긍정이냐"는 제미나이에게 묻지 않는다 — 제미나이는 리뷰 하나하나의 감성 라벨만
 * 매기고, 집계(개수)는 이 모듈이 코드로 직접 계산한다(analyzeReviews 하단 참고).
 *
 * 캐시 구조는 lib/google-reviews.ts / lib/gemini-review-summary.ts와 동일한
 * resultCache/inFlight 패턴 — 같은 가게를 여러 사용자가 봐도 제미나이를 다시 안 부른다.
 */

import { GEMINI_FLASH_MODEL } from "./constants/models";
import type { GoogleReview } from "./google-reviews";

const GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent`;

export type Sentiment = "positive" | "neutral" | "negative";

export interface KeywordTag {
  word: string;
  importance: number; // 1~10
  context: Sentiment;
}

export interface ReviewAnalysisResult {
  sentimentCounts: { positive: number; neutral: number; negative: number };
  totalReviews: number;
  keywords: KeywordTag[];
  oneLiner: string;
}

/** Gemini 원시 응답 형태 — sentiments는 입력 리뷰와 순서·길이가 같아야 한다. */
interface RawAnalysis {
  sentiments: Sentiment[];
  keywords: KeywordTag[];
  oneLiner: string;
}

// 구조화 출력(responseSchema)으로 받는다 — 자유 텍스트 파싱보다 안정적.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    sentiments: {
      type: "ARRAY",
      items: { type: "STRING", enum: ["positive", "neutral", "negative"] },
    },
    keywords: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          importance: { type: "INTEGER" },
          context: { type: "STRING", enum: ["positive", "neutral", "negative"] },
        },
        required: ["word", "importance", "context"],
      },
    },
    oneLiner: { type: "STRING" },
  },
  required: ["sentiments", "keywords", "oneLiner"],
};

function buildPrompt(reviews: GoogleReview[]): string {
  const reviewLines = reviews
    .map((r, i) => `${i + 1}. (별점 ${r.rating}/5) ${r.text || "(본문 없음)"}`)
    .join("\n");

  return [
    `아래는 한 식당의 구글 리뷰 ${reviews.length}개다.`,
    reviewLines,
    "",
    "다음 세 가지를 정확히 수행해라:",
    `1. 리뷰 ${reviews.length}개 각각의 감성을 positive/neutral/negative 중 하나로 분류해라.`,
    "   출력 순서는 입력 리뷰 순서와 반드시 동일해야 한다(1번 리뷰 → sentiments[0] ...).",
    "   비율이나 퍼센트는 계산하지 마라 — 각 리뷰의 라벨만 준다.",
    "2. 리뷰 본문에 실제로 등장하는 단어/짧은 표현만으로 핵심 단어를 8~15개 뽑아라.",
    "   리뷰에 없는 단어를 새로 만들거나 추론해서 추가하지 마라. 각 단어마다 중요도",
    "   (1~10, 자주/강하게 언급될수록 높게)와 맥락(positive/neutral/negative)을 매겨라.",
    "3. 전체 리뷰를 바탕으로 방문 전 참고할 수 있는 한국어 한 줄 총평을 담백하게 써라",
    "   (과장하거나 광고 문구처럼 쓰지 마라).",
  ].join("\n");
}

/** Gemini가 실제로 존재하는 단어만 뽑았는지 코드로 한 번 더 검증 — 리뷰 원문에(대소문자
 * 무시, 부분 문자열로) 없는 키워드는 걸러낸다. 프롬프트 지시만 믿지 않는다. */
function filterHallucinatedKeywords(keywords: KeywordTag[], reviews: GoogleReview[]): KeywordTag[] {
  const haystack = reviews
    .map((r) => r.text)
    .join(" ")
    .toLowerCase();
  return keywords.filter((k) => k.word && haystack.includes(k.word.toLowerCase()));
}

/**
 * 실호출 — Gemini generateContent(구조화 출력). 리뷰가 하나도 없으면 호출하지 않고 null.
 * 키 오류·쿼터 초과·응답 파싱 실패 등은 throw(호출부가 error 상태로 처리) — 단, JSON
 * 파싱 자체가 깨진 경우만 조용히 null(재시도해볼 여지를 남김, 에러로 취급 안 함).
 */
async function analyzeReviews(
  reviews: GoogleReview[],
  apiKey: string
): Promise<ReviewAnalysisResult | null> {
  if (reviews.length === 0) return null;

  const res = await fetch(GENERATE_CONTENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(reviews) }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`gemini generateContent ${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  let raw: RawAnalysis;
  try {
    raw = JSON.parse(text) as RawAnalysis;
  } catch {
    return null;
  }

  // 집계는 여기서 코드로 직접 계산 — Gemini에게 비율/개수를 묻지 않는다.
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const s of raw.sentiments ?? []) {
    if (s === "positive" || s === "neutral" || s === "negative") sentimentCounts[s]++;
  }

  const keywords = filterHallucinatedKeywords(raw.keywords ?? [], reviews).slice(0, 15);

  return {
    sentimentCounts,
    totalReviews: sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative,
    keywords,
    oneLiner: raw.oneLiner?.trim() || "",
  };
}

// ── 짧은 서버 캐시 — 같은 가게를 여러 사용자가 봐도 제미나이를 다시 안 부른다 ──
// (lib/google-reviews.ts의 resultCache/inFlight와 동일한 패턴)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간 — 리뷰/요약 캐시와 동일 주기

const resultCache = new Map<string, { value: ReviewAnalysisResult | null; expiresAt: number }>();
const inFlight = new Map<string, Promise<ReviewAnalysisResult | null>>();

/**
 * 상세 페이지 API 라우트용 진입점. id(카카오 place id 등 우리 쪽 고유값)로 캐시하고,
 * 동시 요청은 in-flight dedupe로 제미나이 호출을 1번만 내보낸다.
 */
export async function analyzeReviewsCached(
  id: string,
  reviews: GoogleReview[],
  apiKey: string
): Promise<ReviewAnalysisResult | null> {
  const cached = resultCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inFlight.get(id);
  if (pending) return pending;

  const request = (async () => {
    const result = await analyzeReviews(reviews, apiKey);
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
