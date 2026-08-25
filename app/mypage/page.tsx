"use client";

export const dynamic = 'force-dynamic';

// "맛집주머니" — 로그인 사용자가 담은 가게 목록.
// 검색/리뷰/AI 분석/담기 토글 로직은 전혀 건드리지 않는다. 삭제는 lib/savedPlaces.ts의
// 기존 toggleSavedPlace()를 그대로 재사용해서 RestaurantCard의 하트 상태(공유 Set)와
// 항상 일치하게 유지한다 — 이 페이지가 별도로 delete 쿼리를 짜지 않는 이유.

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { useAuth, openAuthModal } from "@/lib/auth";
import { toggleSavedPlace } from "@/lib/savedPlaces";
import AuthWidget from "@/components/AuthWidget";

// "색인/장부(ledger)" 리디자인 — app/page.tsx(랜딩) 등 다른 화면과 톤을 맞춘다. 팔레트 값은
// 동일, "use client" 페이지라 RecommendationSection.tsx와 같은 방식으로 모듈 최상단에 재선언.
const PALETTE_VARS = {
  "--paper": "#FAFAF7",
  "--ink": "#1C1B1A",
  "--index-red": "#C81E3A",
  "--ledger": "#DDD9D2",
  "--muted-ink": "#6B6862",
} as React.CSSProperties;

interface SavedPlaceRow {
  id: string;
  place_id: string;
  place_name: string;
  category_name: string | null;
  address: string | null;
  x: number | null;
  y: number | null;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function googleMapsUrl(place: SavedPlaceRow): string {
  const query = `${place.place_name} ${place.address ?? ""}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function MyPage() {
  const { user, loading: authLoading } = useAuth();

  const [places, setPlaces] = useState<SavedPlaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("설정 오류로 담은 가게를 불러올 수 없어요.");
      setLoading(false);
      return;
    }

    // 요구사항: "내 것만" 조건을 코드에서 걸지 않는다 — RLS(auth.uid() = user_id)가
    // 알아서 본인 행만 돌려준다. .eq("user_id", ...) 없음.
    supabase
      .from("saved_places")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError("담은 가게를 불러오지 못했어요.");
        } else {
          setPlaces((data ?? []) as SavedPlaceRow[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function handleDelete(place: SavedPlaceRow) {
    if (!user || deletingId) return;
    setDeletingId(place.id);
    setError(null);
    const { error } = await toggleSavedPlace(user.id, {
      placeId: place.place_id,
      placeName: place.place_name,
      categoryName: place.category_name,
      address: place.address,
      x: place.x,
      y: place.y,
    });
    setDeletingId(null);
    if (error) {
      setError(error);
      return;
    }
    setPlaces((prev) => prev.filter((p) => p.id !== place.id));
  }

  return (
    <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* TopAppBar — app/nearby/page.tsx, app/restaurant/[id]/page.tsx와 같은 패턴 */}
      <header className="w-full top-0 sticky z-40 bg-[var(--paper)] border-b border-[var(--ledger)]">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 h-16 max-w-screen-xl mx-auto">
          <Link
            href="/"
            aria-label="뒤로가기"
            className="text-[var(--muted-ink)] hover:bg-[var(--ledger)]/30 hover:text-[var(--ink)] transition-colors rounded-full p-2 active:opacity-80 flex-shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="font-label text-[var(--ink)] text-lg font-bold flex-1 min-w-0 flex items-center justify-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-[var(--index-red)] text-xl flex-shrink-0">favorite</span>
            맛집주머니
          </h1>
          <AuthWidget variant="inline" palette="index" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-screen-xl mx-auto">
        {authLoading || loading ? (
          <div className="py-16" aria-hidden="true" />
        ) : !user ? (
          <div className="flex flex-col items-center text-center gap-3 py-20 px-4">
            <p className="text-[var(--muted-ink)] font-body">로그인이 필요해요.</p>
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="touch-target px-5 rounded-full border border-[var(--index-red)] text-[var(--index-red)] text-sm font-label font-medium hover:bg-[var(--index-red)]/5 transition-colors"
            >
              로그인
            </button>
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-20 px-4">
            <p className="text-[var(--muted-ink)] font-body">
              아직 담은 맛집이 없어요. 검색하러 가볼까요?
            </p>
            <Link
              href="/"
              className="touch-target px-5 rounded-full border border-[var(--index-red)] text-[var(--index-red)] text-sm font-label font-medium hover:bg-[var(--index-red)]/5 transition-colors flex items-center"
            >
              검색하러 가기
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-[var(--index-red)] px-4 pt-4" role="alert">
                {error}
              </p>
            )}
            {/* 지역 상세 목록의 RestaurantCard와 동일한 장부 리스트로 통일 — 2열 카드 그리드 폐지 */}
            <ul className="flex flex-col">
              {places.map((place) => (
                <li
                  key={place.id}
                  className="group flex justify-between items-start gap-4 pl-3 -ml-3 pr-4 py-5 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold text-[var(--ink)] leading-tight">
                        {place.place_name}
                      </h2>
                      {place.category_name && (
                        <span className="text-[10px] font-bold text-[var(--index-red)] border border-[var(--index-red)]/40 px-1.5 py-0.5">
                          {place.category_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start mt-2">
                      <span className="material-symbols-outlined text-[16px] text-[var(--muted-ink)] mr-1.5 mt-0.5">
                        map
                      </span>
                      <p className="text-sm text-[var(--muted-ink)] font-body">
                        {place.address ?? "주소 정보 없음"}
                      </p>
                    </div>
                    <div className="flex items-center mt-2 gap-3">
                      <span className="text-xs text-[var(--muted-ink)] font-label tabular-nums">
                        {formatDate(place.created_at)} 담음
                      </span>
                      <a
                        href={googleMapsUrl(place)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-label font-medium text-[var(--index-red)] hover:underline"
                      >
                        구글맵 보기
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(place)}
                    disabled={deletingId === place.id}
                    aria-label={`${place.place_name} 담기 취소`}
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-[var(--ledger)] flex items-center justify-center text-[var(--muted-ink)] hover:bg-[var(--ledger)]/20 hover:text-[var(--index-red)] active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
