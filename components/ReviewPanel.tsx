"use client";

import { useEffect, useState } from "react";
import type { GoogleReview } from "@/lib/google-reviews";
import ReviewAnalysisPanel from "@/components/ReviewAnalysisPanel";

type Status = "loading" | "success" | "empty" | "error";

interface ReviewsResponse {
  found: boolean;
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
}

type SummaryStatus = "idle" | "loading" | "ready" | "unavailable" | "error";

interface SummaryResponse {
  available: boolean;
  summary?: string;
}

// F4 확장 — 구글 리뷰 패널. 카카오 로컬 API엔 별점/리뷰가 없어서 구글 Places API(New)에서
// 별도로 받아온다(app/api/reviews/route.ts → lib/google-reviews.ts). 서버 쪽이 id 기준
// 24시간 캐시하므로, 같은 가게를 다시 조회해도(카드 재클릭 등) 대개 빠르게 응답한다.
export default function ReviewPanel({
  id,
  name,
  address,
}: {
  id: string;
  name: string;
  address: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const url = `/api/reviews?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`reviews ${res.status}`);
        return (await res.json()) as ReviewsResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setStatus(json.found ? "success" : "empty");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [id, name, address, retryKey]);

  // AI 리뷰 요약(제미나이) — 구글 리뷰가 성공적으로 로드되고 실제로 리뷰가 있을 때만 자동 호출.
  // 위 리뷰 fetch effect와는 완전히 별개 — 그쪽 로직은 건드리지 않는다.
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>("idle");
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "success" || !data?.reviews || data.reviews.length === 0) return;

    let cancelled = false;
    setSummaryStatus("loading");

    const url = `/api/review-summary?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`review-summary ${res.status}`);
        return (await res.json()) as SummaryResponse;
      })
      .then((json) => {
        if (cancelled) return;
        if (json.available && json.summary) {
          setSummary(json.summary);
          setSummaryStatus("ready");
        } else {
          setSummaryStatus("unavailable");
        }
      })
      .catch(() => {
        if (!cancelled) setSummaryStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [status, data, id, name, address]);

  return (
    <section className="mb-8 border-t border-[var(--ledger)] pt-6">
      <h3 className="font-bold text-lg text-[var(--ink)] mb-3">구글 리뷰</h3>

      {status === "loading" && (
        <div className="space-y-3 animate-pulse" aria-label="리뷰 불러오는 중">
          <div className="h-5 w-32 bg-[var(--ledger)]/30" />
          <div className="h-16 bg-[var(--ledger)]/30" />
          <div className="h-16 bg-[var(--ledger)]/30" />
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center text-center py-6">
          <span
            className="material-symbols-outlined text-4xl text-[var(--muted-ink)]/50 mb-3"
            style={{ fontVariationSettings: "'wght' 200" }}
          >
            wifi_off
          </span>
          <p className="text-sm text-[var(--muted-ink)] mb-4">리뷰를 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="h-9 px-4 border border-[var(--index-red)] text-[var(--index-red)] text-sm font-label font-semibold hover:bg-[var(--index-red)]/5 transition-colors active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="flex flex-col items-center text-center py-6">
          <span
            className="material-symbols-outlined text-4xl text-[var(--muted-ink)]/50 mb-3"
            style={{ fontVariationSettings: "'wght' 200" }}
          >
            rate_review
          </span>
          <p className="text-sm text-[var(--muted-ink)]">구글 리뷰 정보가 없어요</p>
        </div>
      )}

      {status === "success" && data && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="material-symbols-outlined text-[20px] text-[var(--index-red)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="font-bold text-lg text-[var(--ink)] tabular-nums">
              {(data.rating ?? 0).toFixed(1)}
            </span>
            <span className="text-sm text-[var(--muted-ink)]">
              구글 리뷰 <span className="tabular-nums">{(data.userRatingCount ?? 0).toLocaleString("ko-KR")}</span>개
            </span>
          </div>

          {data.reviews && data.reviews.length > 0 ? (
            <ul>
              {data.reviews.map((r, i) => (
                <li key={i} className="border-b border-[var(--ledger)] py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-label font-semibold text-[var(--ink)]">{r.authorName}</span>
                    <span className="text-xs text-[var(--muted-ink)]">{r.relativeTime}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span
                        key={s}
                        className={`material-symbols-outlined text-[14px] ${
                          s < Math.round(r.rating) ? "text-[var(--index-red)]" : "text-[var(--muted-ink)]/30"
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--muted-ink)] leading-relaxed line-clamp-4">{r.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted-ink)]">등록된 리뷰가 없어요</p>
          )}

          {summaryStatus !== "idle" && summaryStatus !== "unavailable" && (
            <div className="mt-4 pt-4 border-t border-[var(--ledger)]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--index-red)]">
                  auto_awesome
                </span>
                <span className="text-xs font-label font-semibold text-[var(--muted-ink)] tracking-wide">
                  AI 리뷰 요약
                </span>
              </div>
              {summaryStatus === "loading" && (
                <div className="h-4 w-3/4 bg-[var(--ledger)]/30 animate-pulse" aria-label="AI 요약 불러오는 중" />
              )}
              {summaryStatus === "ready" && summary && (
                <p className="text-sm text-[var(--ink)] leading-relaxed">{summary}</p>
              )}
              {summaryStatus === "error" && (
                <p className="text-xs text-[var(--muted-ink)]">AI 요약을 불러오지 못했어요</p>
              )}
            </div>
          )}

          {/* AI 감성 분석 — 리뷰가 실제로 있을 때만 마운트(그 안에서 자동으로 분석 시작) */}
          {data.reviews && data.reviews.length > 0 && (
            <ReviewAnalysisPanel id={id} name={name} address={address} />
          )}
        </div>
      )}
    </section>
  );
}
