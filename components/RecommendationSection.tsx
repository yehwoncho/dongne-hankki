"use client";

// 랜딩 "나를 위한 추천" — 로그인 사용자가 가장 많이 담은 카테고리로 카카오를 재검색해 보여준다.
// app/page.tsx(서버 컴포넌트)의 "색인/장부" 팔레트 변수(--paper/--ink/--index-red/--ledger/
// --muted-ink)는 상위 DOM에 CSS 커스텀 프로퍼티로 선언되어 있어 클라이언트 컴포넌트인 여기서도
// var(...)로 그대로 상속받아 쓴다 — AuthWidget의 palette="index"와 같은 방식.
//
// 기존 담기(lib/savedPlaces.ts)·검색(lib/kakao.ts) 코드는 전혀 건드리지 않는다: 본인
// saved_places 조회는 RLS가 이미 허용하는 일반 select라 별도 함수 없이 여기서 직접 부른다.

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { KakaoNearbyItem } from "@/lib/types";

const SERIF = '"Noto Serif KR", serif';

interface SavedPlaceRow {
  place_id: string;
  category_name: string | null;
  x: number | null; // 경도(lng)
  y: number | null; // 위도(lat)
}

// status는 멤버마다 리터럴 하나씩 — "idle" | "loading" 처럼 한 멤버에 유니언 값을 넣으면
// 아래 JSX의 삼항연산자 체인에서 TS가 "ready" 분기의 items를 좁혀내지 못한다(판별 유니언
// 좁히기가 멤버당 단일 리터럴 판별자를 전제로 함).
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "empty-saved" } // 로그인은 했지만 담은 가게가 0개
  | { status: "empty-result" } // 담은 건 있지만 추천할 새 가게가 없음
  | { status: "ready"; items: KakaoNearbyItem[] };

/** 카테고리별 개수를 세어 가장 많이 담은 카테고리를 찾는다. rows는 이미 created_at desc
 * 순이라, 동률이면 먼저 그 개수에 도달한(=더 최근에 담긴) 카테고리가 그대로 유지된다. */
function pickTopCategory(rows: SavedPlaceRow[]): string | null {
  const counts = new Map<string, number>();
  let best: string | null = null;
  let bestCount = 0;
  for (const row of rows) {
    if (!row.category_name) continue;
    const next = (counts.get(row.category_name) ?? 0) + 1;
    counts.set(row.category_name, next);
    if (next > bestCount) {
      bestCount = next;
      best = row.category_name;
    }
  }
  return best;
}

export default function RecommendationSection() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return; // 비로그인 — 섹션 자체를 렌더링하지 않는다

    let cancelled = false;

    async function run() {
      setState({ status: "loading" });

      const supabase = getSupabaseClient();
      if (!supabase) {
        // 설정 오류(환경변수 누락) — 조용히 "추천 없음"으로 처리, 다른 페이지는 그대로 동작.
        setState({ status: "empty-saved" });
        return;
      }

      const { data, error } = await supabase
        .from("saved_places")
        .select("place_id, category_name, x, y")
        .order("created_at", { ascending: false });
      if (cancelled) return;

      const rows = (error ? [] : (data ?? [])) as SavedPlaceRow[];
      if (rows.length === 0) {
        setState({ status: "empty-saved" });
        return;
      }

      const topCategory = pickTopCategory(rows);
      const anchor = rows[0]; // 가장 최근에 담은 가게 좌표를 재검색 기준점으로 쓴다
      if (!topCategory || anchor.x == null || anchor.y == null) {
        setState({ status: "empty-result" });
        return;
      }

      const savedIds = new Set(rows.map((r) => r.place_id));

      try {
        const res = await fetch(
          `/api/recommend?category=${encodeURIComponent(topCategory)}&x=${anchor.x}&y=${anchor.y}`
        );
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "empty-result" });
          return;
        }
        const json = (await res.json()) as { items?: KakaoNearbyItem[] };
        const fresh = (json.items ?? []).filter((item) => !savedIds.has(item.kakaoId)).slice(0, 5);
        setState(fresh.length > 0 ? { status: "ready", items: fresh } : { status: "empty-result" });
      } catch {
        if (!cancelled) setState({ status: "empty-result" });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (authLoading || !user) return null; // 비로그인 — 섹션 미표시

  return (
    <section className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <p className="text-xs tracking-[0.2em] uppercase text-[var(--muted-ink)] font-label mb-3">
        맞춤 추천
      </p>
      <h2
        className="text-2xl sm:text-3xl font-bold text-[var(--ink)] mb-5 leading-[1.1] break-keep"
        style={{ fontFamily: SERIF }}
      >
        나를 위한 추천
      </h2>

      {state.status === "loading" || state.status === "idle" ? (
        <p className="text-sm text-[var(--muted-ink)] font-body py-6">추천을 준비하고 있어요...</p>
      ) : state.status === "empty-saved" ? (
        <p className="text-sm text-[var(--muted-ink)] font-body py-6 break-keep">
          담은 가게가 아직 없어요. 마음에 드는 곳을 담아보시면 취향에 맞는 곳을 추천해드릴게요.
        </p>
      ) : state.status === "empty-result" ? (
        <p className="text-sm text-[var(--muted-ink)] font-body py-6 break-keep">
          지금은 추천할 새로운 가게가 없어요.
        </p>
      ) : (
        <ul>
          {state.items.map((item) => (
            <li key={item.kakaoId}>
              <a
                href={item.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-4 py-4 pl-3 -ml-3 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="font-bold text-[var(--ink)] text-base font-body truncate min-w-0">
                    {item.name}
                  </span>
                  <span className="text-xs text-[var(--muted-ink)] font-label flex-shrink-0">
                    {item.rawCategoryName.split(">").pop()?.trim()}
                  </span>
                </span>
                <span className="material-symbols-outlined text-[18px] text-[var(--muted-ink)] group-hover:text-[var(--ink)] transition-colors flex-shrink-0">
                  open_in_new
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
