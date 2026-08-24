// "담기(찜)" 상태 — lib/auth.ts와 동일한 useSyncExternalStore 패턴.
//
// 카드마다 따로 saved_places를 조회하지 않는다: 로그인 사용자가 확정되는 순간 이 모듈이
// 딱 한 번 전체 place_id 목록을 불러와 모듈 스코프 Set에 채워두고, 화면의 모든
// RestaurantCard는 이 하나의 스토어를 구독한다(useSavedPlaceIds). 로그아웃하면 비운다.
//
// lib/auth.ts의 내부 스토어에 의존하지 않고 supabase.auth.onAuthStateChange를 직접
// 구독한다 — Supabase 클라이언트는 여러 구독자를 허용하므로 문제없다.

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase-client";

export interface SavedPlaceInput {
  placeId: string;
  placeName: string;
  categoryName: string | null;
  address: string | null;
  x: number | null;
  y: number | null;
}

// 고정된 빈 상태 상수 — lib/auth.ts의 INITIAL_STATE와 같은 이유(getServerSnapshot이
// 매번 새 객체를 반환하면 "should be cached" 무한 루프 경고가 뜬다). 이 참조 하나만 계속 재사용.
const EMPTY: ReadonlySet<string> = new Set();

let savedIds: ReadonlySet<string> = EMPTY;
const listeners = new Set<() => void>();
let currentUserId: string | null = null;
let started = false;

function emit() {
  for (const listener of listeners) listener();
}

function setSavedIds(next: ReadonlySet<string>) {
  savedIds = next;
  emit();
}

async function loadForUser(userId: string) {
  const { data, error } = await supabase.from("saved_places").select("place_id").eq("user_id", userId);
  if (error) {
    // 조용히 실패 — 카드들은 "안 담김" 상태로 남고, 사용자가 다시 담기를 누르면
    // toggleSavedPlace가 낙관적으로 처리하니 화면이 막히진 않는다.
    return;
  }
  // 로딩 도중 로그아웃했을 수도 있으니, 그사이 사용자가 바뀌었으면 이 결과는 버린다.
  if (currentUserId !== userId) return;
  setSavedIds(new Set((data ?? []).map((row) => row.place_id as string)));
}

function ensureStarted() {
  if (started) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    const userId = data.session?.user?.id ?? null;
    currentUserId = userId;
    if (userId) {
      loadForUser(userId);
    } else {
      setSavedIds(EMPTY);
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user?.id ?? null;
    if (userId === currentUserId) return; // 같은 사용자면 다시 불러올 필요 없음
    currentUserId = userId;
    if (userId) {
      loadForUser(userId);
    } else {
      setSavedIds(EMPTY);
    }
  });
}

function subscribe(listener: () => void): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ReadonlySet<string> {
  return savedIds;
}

function getServerSnapshot(): ReadonlySet<string> {
  return EMPTY;
}

/** 로그인한 사용자가 담아둔 장소 id 집합을 구독한다. 비로그인/로딩 중엔 빈 Set. */
export function useSavedPlaceIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 담기 ↔ 취소 토글. 실패하면 낙관적 변경을 되돌리고 에러 문자열을 반환한다. */
export async function toggleSavedPlace(
  userId: string,
  place: SavedPlaceInput
): Promise<{ error: string | null }> {
  const prev = savedIds;
  const wasSaved = prev.has(place.placeId);

  const next = new Set(prev);
  if (wasSaved) {
    next.delete(place.placeId);
  } else {
    next.add(place.placeId);
  }
  setSavedIds(next); // 낙관적 업데이트 — 버튼이 즉시 바뀐다

  if (wasSaved) {
    const { error } = await supabase
      .from("saved_places")
      .delete()
      .eq("user_id", userId)
      .eq("place_id", place.placeId);
    if (error) {
      setSavedIds(prev);
      return { error: "담기를 취소하지 못했어요." };
    }
  } else {
    const { error } = await supabase.from("saved_places").insert({
      user_id: userId,
      place_id: place.placeId,
      place_name: place.placeName,
      category_name: place.categoryName,
      address: place.address,
      x: place.x,
      y: place.y,
    });
    if (error) {
      setSavedIds(prev);
      return { error: "담지 못했어요." };
    }
  }

  return { error: null };
}
