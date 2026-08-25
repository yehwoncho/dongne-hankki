"use client";

// AI 리뷰 감성 분석 패널 — components/ReviewPanel.tsx가 리뷰를 성공적으로 불러오고
// (reviews.length > 0) 나서만 이 컴포넌트를 마운트한다(리뷰 0건이면 애초에 안 그림).
// 마운트되는 순간(별도 버튼 없이) 바로 분석을 시작한다.
//
// 색은 app/page.tsx의 PALETTE_VARS만 재사용한다 — 새 색상 값 없음. 긍정=--ink(가장 진한
// 색), 중립=--muted-ink(회색), 부정=--index-red(이미 이 앱 전체에서 "강조/경고" 용도로
// 쓰는 색)로 매핑한다.

import { useEffect, useState } from "react";
import { fetchReviewAnalysisCached, type ReviewAnalysisResponse, type Sentiment } from "@/lib/reviewAnalysis";

type Status = "loading" | "ready" | "unavailable" | "error";

const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "긍정",
  neutral: "보통",
  negative: "부정",
};

const SENTIMENT_TEXT_COLOR: Record<Sentiment, string> = {
  positive: "text-[var(--ink)]",
  neutral: "text-[var(--muted-ink)]",
  negative: "text-[var(--index-red)]",
};

const SENTIMENT_BAR_COLOR: Record<Sentiment, string> = {
  positive: "bg-[var(--ink)]",
  neutral: "bg-[var(--muted-ink)]/40",
  negative: "bg-[var(--index-red)]",
};

/** 중요도(1~10) → 워드클라우드 글자 크기(px). 리스트/표 숫자가 아니라 시각적 크기라
 * tabular-nums 대상은 아님. */
function keywordFontSize(importance: number): number {
  const clamped = Math.min(10, Math.max(1, importance));
  return Math.round(12 + ((clamped - 1) * (26 - 12)) / 9);
}

export default function ReviewAnalysisPanel({
  id,
  name,
  address,
}: {
  id: string;
  name: string;
  address: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<ReviewAnalysisResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetchReviewAnalysisCached(id, name, address)
      .then((json) => {
        if (cancelled) return;
        if (json.available) {
          setResult(json);
          setStatus("ready");
        } else {
          setStatus("unavailable");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [id, name, address]);

  if (status === "unavailable") return null; // 키 미설정 등 — 조용히 숨김

  return (
    <div className="mt-4 pt-4 border-t border-[var(--ledger)]">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="material-symbols-outlined text-[16px] text-[var(--index-red)]">auto_awesome</span>
        <span className="text-xs font-label font-semibold text-[var(--muted-ink)] tracking-wide">
          AI 감성 분석
        </span>
      </div>

      {status === "loading" && (
        <p className="text-sm text-[var(--muted-ink)]" aria-live="polite">
          AI가 리뷰를 분석하는 중…
        </p>
      )}

      {status === "error" && (
        <p className="text-xs text-[var(--muted-ink)]">AI 감성 분석을 불러오지 못했어요</p>
      )}

      {status === "ready" && result && (
        <div className="space-y-5">
          {/* 긍정/보통/부정 비율 막대 */}
          <SentimentBar
            counts={result.sentimentCounts ?? { positive: 0, neutral: 0, negative: 0 }}
            total={result.totalReviews ?? 0}
          />

          {/* 핵심 단어 워드클라우드 */}
          {result.keywords && result.keywords.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              {result.keywords.map((k, i) => (
                <span
                  key={`${k.word}-${i}`}
                  className={`font-label leading-none ${SENTIMENT_TEXT_COLOR[k.context]} ${
                    k.importance >= 7 ? "font-bold" : "font-medium"
                  }`}
                  style={{ fontSize: `${keywordFontSize(k.importance)}px` }}
                >
                  {k.word}
                </span>
              ))}
            </div>
          )}

          {/* 총평 말풍선 */}
          {result.oneLiner && (
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-[var(--muted-ink)] mt-1.5 flex-shrink-0">
                forum
              </span>
              <p className="text-sm text-[var(--ink)] leading-relaxed border border-[var(--ledger)] rounded-md px-3 py-2">
                {result.oneLiner}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SentimentBar({
  counts,
  total,
}: {
  counts: { positive: number; neutral: number; negative: number };
  total: number;
}) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const sentiments: Sentiment[] = ["positive", "neutral", "negative"];

  return (
    <div>
      <div className="w-full h-2 flex overflow-hidden bg-[var(--ledger)]/30">
        {sentiments.map((s) => (
          <div
            key={s}
            className={SENTIMENT_BAR_COLOR[s]}
            style={{ width: `${pct(counts[s])}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 mt-2 text-xs font-label">
        {sentiments.map((s) => (
          <span key={s} className={SENTIMENT_TEXT_COLOR[s]}>
            {SENTIMENT_LABEL[s]}{" "}
            <span className="tabular-nums">
              {pct(counts[s])}% ({counts[s]}건)
            </span>
          </span>
        ))}
      </div>
      <p className="text-[10px] text-[var(--muted-ink)] mt-1.5">
        리뷰 <span className="tabular-nums">{total}</span>건 기준 — 표본이 작아 참고용으로만 봐주세요.
      </p>
    </div>
  );
}
