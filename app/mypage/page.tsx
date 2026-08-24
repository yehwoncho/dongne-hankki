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
    <>
      {/* TopAppBar — app/nearby/page.tsx, app/restaurant/[id]/page.tsx와 같은 패턴 */}
      <header className="w-full top-0 sticky z-40 bg-surface border-b border-outline-variant">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 h-16 max-w-screen-xl mx-auto">
          <Link
            href="/"
            aria-label="뒤로가기"
            className="text-on-surface-variant hover:bg-surface-container transition-colors rounded-full p-2 active:opacity-80 flex-shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="font-headline text-on-surface text-lg font-bold flex-1 min-w-0 flex items-center justify-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">favorite</span>
            맛집주머니
          </h1>
          <AuthWidget variant="inline" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-screen-xl mx-auto">
        {authLoading || loading ? (
          <div className="py-16" aria-hidden="true" />
        ) : !user ? (
          <div className="flex flex-col items-center text-center gap-3 py-20 px-4">
            <p className="text-on-surface-variant font-body">로그인이 필요해요.</p>
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="touch-target px-5 rounded-full bg-primary text-on-primary text-sm font-label font-medium shadow-sm hover:opacity-90 transition-opacity"
            >
              로그인
            </button>
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 py-20 px-4">
            <p className="text-on-surface-variant font-body">
              아직 담은 맛집이 없어요. 검색하러 가볼까요?
            </p>
            <Link
              href="/"
              className="touch-target px-5 rounded-full bg-primary text-on-primary text-sm font-label font-medium shadow-sm hover:opacity-90 transition-opacity flex items-center"
            >
              검색하러 가기
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-error px-4 pt-4" role="alert">
                {error}
              </p>
            )}
            {/* 넓은 화면에서는 2열 카드 그리드로 — RestaurantCard와 같은 처리 */}
            <ul className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-4 lg:py-4">
              {places.map((place) => (
                <li
                  key={place.id}
                  className="px-4 py-5 lg:p-5 border-b lg:border-b-0 lg:border border-surface-variant lg:rounded-xl flex justify-between items-start hover:bg-surface-container-lowest lg:hover:border-primary transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-bold text-on-surface leading-tight">
                        {place.place_name}
                      </h2>
                      {place.category_name && (
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          {place.category_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start mt-2">
                      <span className="material-symbols-outlined text-[16px] text-outline mr-1.5 mt-0.5">
                        map
                      </span>
                      <p className="text-sm text-on-surface-variant font-body">
                        {place.address ?? "주소 정보 없음"}
                      </p>
                    </div>
                    <div className="flex items-center mt-2 gap-3">
                      <span className="text-xs text-outline font-label">
                        {formatDate(place.created_at)} 담음
                      </span>
                      <a
                        href={googleMapsUrl(place)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-label font-medium text-primary hover:underline"
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
                    className="flex-shrink-0 w-10 h-10 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-error active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
