"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/category";
import type { Category, KakaoNearbyItem } from "@/lib/types";
import NearbyMap from "./NearbyMap";
import NearbyList from "./NearbyList";
import SourceBadge from "./SourceBadge";

const RADIUS_STEPS = [500, 1000, 2000] as const;
type RadiusStep = (typeof RADIUS_STEPS)[number];

type ViewState =
  | { status: "requesting-permission" }
  | { status: "permission-denied" }
  | { status: "unsupported" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: KakaoNearbyItem[]; truncated: boolean; center: { lat: number; lng: number } };

// F7 "내 주변 맛집" 오케스트레이터 — Geolocation 권한 요청 → /api/nearby 조회 → 지도/리스트 렌더.
// PRD v0.2 §6-F7: 지도가 메인 뷰(F3 지역목록과 반대), 정렬은 거리순 고정, 카테고리 필터는 §5.3 재사용.
export default function NearbyView() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<RadiusStep>(1000);
  const [category, setCategory] = useState<Category | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<ViewState>({ status: "requesting-permission" });

  // 1) 진입 시 위치 권한 요청 (F7 수용기준: 승인 → 3초 이내 결과)
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        setState({ status: err.code === err.PERMISSION_DENIED ? "permission-denied" : "error" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);

  const fetchNearby = useCallback(async (lat: number, lng: number, r: number, signal?: AbortSignal) => {
    const res = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${r}`, { signal });
    if (!res.ok) throw new Error("nearby fetch failed");
    return (await res.json()) as { items: KakaoNearbyItem[]; truncated: boolean; center: { lat: number; lng: number } };
  }, []);

  // 좌표 + 시작 반경으로 조회하고, 결과 0건이면 반경을 자동으로 한 단계씩 넓혀 재조회한다
  // (F6 예외처리: "좌표는 얻었으나 결과 0건" → 최대 2000m까지 자동 확대). 초기 진입·수동 반경
  // 변경 양쪽에서 공유하는 단일 경로 — 별도 useEffect 두 개로 나누면 상태 경합이 생기기 쉽다.
  const runQuery = useCallback(
    async (lat: number, lng: number, startRadius: RadiusStep, signal?: AbortSignal) => {
      setState({ status: "loading" });
      try {
        let r: RadiusStep = startRadius;
        let data = await fetchNearby(lat, lng, r, signal);

        while (data.items.length === 0) {
          const next = RADIUS_STEPS[RADIUS_STEPS.indexOf(r) + 1];
          if (!next) break;
          r = next;
          data = await fetchNearby(lat, lng, r, signal);
        }

        if (signal?.aborted) return;
        setRadius(r); // 자동 확대된 반경을 토글 UI에도 반영
        setState({ status: "ready", items: data.items, truncated: data.truncated, center: data.center });
      } catch {
        if (signal?.aborted) return;
        setState({ status: "error" });
      }
    },
    [fetchNearby]
  );

  // 진입 시 좌표가 잡히면 현재 선택된 반경(기본 1km)부터 조회한다.
  useEffect(() => {
    if (!coords) return;
    const controller = new AbortController();
    runQuery(coords.lat, coords.lng, radius, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  // 사용자가 직접 반경 토글을 눌렀을 때 재조회 (자동확대와 동일 경로 재사용)
  function handleRadiusChange(r: RadiusStep) {
    if (!coords) return;
    runQuery(coords.lat, coords.lng, r);
  }

  const filteredItems = useMemo(() => {
    if (state.status !== "ready") return [];
    return category === "all" ? state.items : state.items.filter((i) => i.category === category);
  }, [state, category]);

  function retry() {
    setState({ status: "requesting-permission" });
    setCoords(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setState({ status: err.code === err.PERMISSION_DENIED ? "permission-denied" : "error" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  }

  if (state.status === "unsupported" || state.status === "permission-denied") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant mb-6" style={{ fontVariationSettings: "'wght' 200" }}>
          location_off
        </span>
        <h2 className="text-xl font-bold font-headline text-on-surface mb-2">위치 권한이 필요해요</h2>
        <p className="text-sm text-on-surface-variant mb-8 max-w-[280px] leading-relaxed">
          브라우저 위치 접근을 허용하시거나, 지역을 직접 선택해 찾아보세요.
        </p>
        <div className="w-full max-w-[280px] flex flex-col gap-3">
          <button
            type="button"
            onClick={retry}
            className="w-full h-12 rounded-lg border border-primary text-primary font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="w-full h-12 rounded-lg border border-outline text-on-surface font-label font-semibold flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95"
          >
            지역 직접 선택하기
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant mb-6" style={{ fontVariationSettings: "'wght' 200" }}>
          wifi_off
        </span>
        <h2 className="text-xl font-bold font-headline text-on-surface mb-2">지금은 주변 정보를 불러올 수 없어요</h2>
        <div className="w-full max-w-[280px] flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={retry}
            className="w-full h-12 rounded-lg border border-primary text-primary font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="w-full h-12 rounded-lg border border-outline text-on-surface font-label font-semibold flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95"
          >
            지역 선택으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = state.status === "requesting-permission" || state.status === "loading";
  const center = state.status === "ready" ? state.center : coords ?? { lat: 37.5665, lng: 126.978 };

  return (
    <div className="flex-1 flex flex-col">
      {/* 컨트롤 바 — 반경 토글 + 카테고리 필터 (§6-F7) */}
      <div className="px-4 py-3 border-b border-[var(--ledger)] bg-[var(--paper)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="반경 선택">
          {RADIUS_STEPS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRadiusChange(r)}
              aria-pressed={radius === r}
              className={`px-3 py-1.5 text-xs font-label font-semibold border transition-colors touch-target ${
                radius === r
                  ? "bg-[var(--index-red)]/5 text-[var(--index-red)] border-[var(--index-red)]"
                  : "bg-transparent text-[var(--muted-ink)] border-[var(--ledger)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-sm font-label text-[var(--muted-ink)]">
          카테고리
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | "all")}
            className="bg-white border border-[var(--ledger)] rounded-md px-2 py-1.5 text-sm text-[var(--ink)] touch-target outline-none focus:ring-2 focus:ring-[var(--index-red)]"
          >
            <option value="all">전체</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 지도 — F7은 지도가 메인 뷰. 여기 배경색은 페이지 쪽 컨테이너일 뿐 NearbyMap 내부는 미변경 */}
      <div className="w-full h-[45vh] min-h-[280px] relative bg-[var(--ledger)]/15">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-[var(--index-red)] text-3xl">progress_activity</span>
          </div>
        ) : (
          <NearbyMap items={filteredItems} center={center} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </div>

      {/* 상태 요약 줄 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--ledger)]">
        <span className="font-label text-sm text-[var(--ink)]">
          {isLoading ? "불러오는 중…" : (
            <>
              주변 <span className="tabular-nums">{filteredItems.length}</span>곳
            </>
          )}
        </span>
        <SourceBadge source="kakao" />
      </div>

      {state.status === "ready" && state.truncated && (
        <div className="border-b border-[var(--index-red)]/30 bg-[var(--index-red)]/5 text-[var(--index-red)] text-xs font-label text-center py-2 px-4">
          이 반경엔 더 많은 곳이 있을 수 있어요 · 반경을 좁혀보세요
        </div>
      )}

      {/* 리스트 — 지도 아래 보조 뷰 */}
      {isLoading ? (
        <ul className="flex flex-col">
          {[...Array(3)].map((_, i) => (
            <li key={i} className="px-4 py-5 border-b border-[var(--ledger)] animate-pulse">
              <div className="h-4 bg-[var(--ledger)]/30 w-1/2 mb-2" />
              <div className="h-3 bg-[var(--ledger)]/30 w-1/3" />
            </li>
          ))}
        </ul>
      ) : (
        <NearbyList items={filteredItems} selectedId={selectedId} onSelect={setSelectedId} />
      )}
    </div>
  );
}
