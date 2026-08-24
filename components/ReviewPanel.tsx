"use client";

import { useEffect, useState } from "react";
import type { GoogleReview } from "@/lib/google-reviews";

type Status = "loading" | "success" | "empty" | "error";

interface ReviewsResponse {
  found: boolean;
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
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

  return (
    <section className="mb-8 border-t border-outline-variant pt-6">
      <h3 className="font-headline font-semibold text-lg text-on-surface mb-3">구글 리뷰</h3>

      {status === "loading" && (
        <div className="space-y-3 animate-pulse" aria-label="리뷰 불러오는 중">
          <div className="h-5 w-32 bg-surface-container-high rounded" />
          <div className="h-16 bg-surface-container-high rounded-lg" />
          <div className="h-16 bg-surface-container-high rounded-lg" />
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center text-center py-6">
          <span
            className="material-symbols-outlined text-4xl text-outline-variant mb-3"
            style={{ fontVariationSettings: "'wght' 200" }}
          >
            wifi_off
          </span>
          <p className="text-sm text-on-surface-variant mb-4">리뷰를 불러오지 못했어요</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="h-9 px-4 rounded-lg border border-primary text-primary text-sm font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "empty" && (
        <div className="flex flex-col items-center text-center py-6">
          <span
            className="material-symbols-outlined text-4xl text-outline-variant mb-3"
            style={{ fontVariationSettings: "'wght' 200" }}
          >
            rate_review
          </span>
          <p className="text-sm text-on-surface-variant">구글 리뷰 정보가 없어요</p>
        </div>
      )}

      {status === "success" && data && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="material-symbols-outlined text-[20px] text-accent"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span className="font-headline font-bold text-lg text-on-surface">
              {(data.rating ?? 0).toFixed(1)}
            </span>
            <span className="text-sm text-on-surface-variant">
              구글 리뷰 {(data.userRatingCount ?? 0).toLocaleString("ko-KR")}개
            </span>
          </div>

          {data.reviews && data.reviews.length > 0 ? (
            <ul className="space-y-3">
              {data.reviews.map((r, i) => (
                <li key={i} className="bg-surface-container-low border border-outline-variant rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-label font-semibold text-on-surface">{r.authorName}</span>
                    <span className="text-xs text-on-surface-variant">{r.relativeTime}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span
                        key={s}
                        className={`material-symbols-outlined text-[14px] ${
                          s < Math.round(r.rating) ? "text-accent" : "text-outline-variant"
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-4">{r.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-on-surface-variant">등록된 리뷰가 없어요</p>
          )}
        </div>
      )}
    </section>
  );
}
