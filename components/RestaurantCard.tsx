"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORY_LABELS } from "@/lib/category";
import type { Restaurant } from "@/lib/types";
import { useAuth, openAuthModal } from "@/lib/auth";
import { useSavedPlaceIds, toggleSavedPlace } from "@/lib/savedPlaces";

// F3 식당 카드 — Stitch 목록 화면 <li> 마크업 그대로.
//
// ⚠️ 카카오 전환(WIRE_DETAIL_PAGE.md): 카카오 로컬 API엔 "id로 상세 조회"가 없어서,
// 상세 페이지 링크에 sido/sigungu 슬러그를 같이 실어 보낸다 — 상세 페이지가 이 값으로
// 목록 조회 때 캐시된 45건 안에서 id를 찾는다. restaurant 객체엔 슬러그가 없으므로
// (sido/sigungu는 한글명뿐) 부모(목록 페이지)가 이미 알고 있는 슬러그를 별도 prop으로 받는다.
//
// 담기 버튼 때문에 클라이언트 컴포넌트로 승격했다(useAuth/useSavedPlaceIds가 훅이라 필요).
// 부모(app/[sido]/[sigungu]/page.tsx)는 그대로 Server Component — props가 전부 직렬화
// 가능한 값이라 문제없다.
export default function RestaurantCard({
  restaurant,
  sidoSlug,
  sigunguSlug,
}: {
  restaurant: Restaurant;
  sidoSlug: string;
  sigunguSlug: string;
}) {
  const detailHref = `/restaurant/${restaurant.id}?sido=${sidoSlug}&sigungu=${sigunguSlug}`;

  const { user } = useAuth();
  const savedIds = useSavedPlaceIds();
  const saved = savedIds.has(restaurant.id);
  const [pending, setPending] = useState(false);
  const [loginNotice, setLoginNotice] = useState(false);

  async function handleToggleSave() {
    if (!user) {
      setLoginNotice(true);
      openAuthModal();
      window.setTimeout(() => setLoginNotice(false), 2500);
      return;
    }
    if (pending) return;
    setPending(true);
    await toggleSavedPlace(user.id, {
      placeId: restaurant.id,
      placeName: restaurant.name,
      categoryName: CATEGORY_LABELS[restaurant.category],
      address: restaurant.roadAddress ?? restaurant.jibunAddress,
      x: restaurant.lng,
      y: restaurant.lat,
    });
    setPending(false);
  }

  return (
    <li className="group flex justify-between items-start gap-4 pl-3 -ml-3 pr-4 py-5 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors">
      <Link href={detailHref} className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-bold text-[var(--ink)] leading-tight">{restaurant.name}</h2>
          <span className="text-[10px] font-bold text-[var(--index-red)] border border-[var(--index-red)]/40 px-1.5 py-0.5">
            {CATEGORY_LABELS[restaurant.category]}
          </span>
        </div>
        <div className="flex items-start mt-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--muted-ink)] mr-1.5 mt-0.5">map</span>
          <p className="text-sm text-[var(--muted-ink)] font-body">{restaurant.roadAddress ?? "주소 정보 없음"}</p>
        </div>
        <div className="flex items-center mt-1">
          <span className="material-symbols-outlined text-[16px] text-[var(--muted-ink)] mr-1.5">call</span>
          <p className={`text-sm font-body ${restaurant.phone ? "text-[var(--muted-ink)]" : "text-[var(--muted-ink)]/50"}`}>
            {restaurant.phone ?? "전화번호 없음"}
          </p>
        </div>
      </Link>
      {/* 담기 버튼과 상세보기 링크는 형제로 나란히 — 버튼 안에 링크(또는 그 반대) 중첩 금지 */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={pending}
            aria-label={saved ? `${restaurant.name} 담기 취소` : `${restaurant.name} 담기`}
            aria-pressed={saved}
            className="w-10 h-10 rounded-full border border-[var(--ledger)] flex items-center justify-center hover:bg-[var(--ledger)]/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${saved ? "text-[var(--index-red)]" : "text-[var(--muted-ink)]"}`}
              style={{ fontVariationSettings: saved ? "'FILL' 1" : "'FILL' 0" }}
            >
              {saved ? "favorite" : "favorite_border"}
            </span>
          </button>

          {loginNotice && (
            <div
              role="status"
              className="absolute right-0 top-11 z-10 whitespace-nowrap bg-[var(--ink)] text-[var(--paper)] text-xs font-label rounded-lg px-2.5 py-1.5"
            >
              로그인하면 담을 수 있어요
            </div>
          )}
        </div>

        <Link
          href={detailHref}
          aria-label={`${restaurant.name} 상세보기`}
          className="w-10 h-10 rounded-full border border-[var(--ledger)] flex items-center justify-center text-[var(--muted-ink)] hover:bg-[var(--ledger)]/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">location_on</span>
        </Link>
      </div>
    </li>
  );
}
