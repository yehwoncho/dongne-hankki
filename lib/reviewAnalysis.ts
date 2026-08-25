/**
 * AI 감성 분석(app/api/review-analysis/route.ts) 클라이언트 페처.
 *
 * sessionStorage에 가게 id별로 캐싱한다 — 같은 세션에서 같은 가게를 다시 열어도(카드
 * 재클릭 등) 네트워크 요청을 다시 보내지 않는다. 서버 쪽 24시간 캐시
 * (lib/gemini-review-analysis.ts)와는 별개 계층 — 여긴 "이 브라우저 탭이 이미 받아본
 * 결과"만 재사용한다.
 */

export type Sentiment = "positive" | "neutral" | "negative";

export interface KeywordTag {
  word: string;
  importance: number;
  context: Sentiment;
}

export interface ReviewAnalysisResponse {
  available: boolean;
  sentimentCounts?: { positive: number; neutral: number; negative: number };
  totalReviews?: number;
  keywords?: KeywordTag[];
  oneLiner?: string;
}

function cacheKey(id: string): string {
  return `review-analysis:${id}`;
}

function readCache(id: string): ReviewAnalysisResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(id));
    return raw ? (JSON.parse(raw) as ReviewAnalysisResponse) : null;
  } catch {
    return null; // sessionStorage 접근 실패(프라이빗 모드 등) — 캐시 없이 진행
  }
}

function writeCache(id: string, value: ReviewAnalysisResponse): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cacheKey(id), JSON.stringify(value));
  } catch {
    // 저장 실패해도 기능엔 지장 없음 — 다음에 다시 받아오면 됨
  }
}

/**
 * id/name/address로 AI 감성 분석을 받아온다. 세션 캐시에 있으면 네트워크 요청 없이
 * 즉시 반환. "unavailable" 응답은 캐싱하지 않는다(나중에 키가 등록되는 등 상황이
 * 바뀌면 다음 세션에서 다시 시도할 여지를 남긴다).
 */
export async function fetchReviewAnalysisCached(
  id: string,
  name: string,
  address: string
): Promise<ReviewAnalysisResponse> {
  const cached = readCache(id);
  if (cached) return cached;

  const url = `/api/review-analysis?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`review-analysis ${res.status}`);
  const json = (await res.json()) as ReviewAnalysisResponse;

  if (json.available) writeCache(id, json);
  return json;
}
