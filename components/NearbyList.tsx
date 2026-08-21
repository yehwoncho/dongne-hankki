"use client";

import { useEffect, useRef } from "react";
import { CATEGORY_LABELS } from "@/lib/category";
import type { KakaoNearbyItem } from "@/lib/types";
import SourceBadge from "./SourceBadge";

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
}

// F7 지도 아래 보조 리스트 — 카드 클릭 → 지도 마커 하이라이트, 마커 클릭 → 카드로 스크롤
// (F7 수용기준: 양방향 연동). 정렬은 항상 거리순 고정(§5.4·§6-F7 원칙 — 평점이 없으니 다른 정렬 없음).
export default function NearbyList({
  items,
  selectedId,
  onSelect,
}: {
  items: KakaoNearbyItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span
          className="material-symbols-outlined text-6xl text-outline-variant mb-4"
          style={{ fontVariationSettings: "'wght' 200" }}
        >
          location_off
        </span>
        <p className="text-sm text-on-surface-variant">주변에 결과가 없어요</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col overflow-y-auto">
      {items.map((item) => {
        const isSelected = item.kakaoId === selectedId;
        return (
          <li
            key={item.kakaoId}
            ref={(el) => {
              if (el) cardRefs.current.set(item.kakaoId, el);
              else cardRefs.current.delete(item.kakaoId);
            }}
            className={`px-4 py-4 border-b border-surface-variant flex justify-between items-start transition-colors ${
              isSelected ? "bg-primary-container/30" : "hover:bg-surface-container-lowest"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(item.kakaoId)}
              className="flex-1 pr-4 text-left touch-target"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-base font-bold text-on-surface leading-tight">{item.name}</h3>
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  {CATEGORY_LABELS[item.category]}
                </span>
                <span className="text-xs font-label font-semibold text-primary">{formatDistance(item.distanceMeters)}</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="material-symbols-outlined text-[16px] text-outline mr-1.5">call</span>
                <p className={`text-sm font-body ${item.phone ? "text-on-surface-variant" : "text-outline"}`}>
                  {item.phone ?? "전화번호 없음"}
                </p>
              </div>
              <div className="mt-2">
                <SourceBadge source="kakao" />
              </div>
            </button>

            <div className="flex flex-col gap-2 flex-shrink-0">
              {item.phone && (
                <a
                  href={`tel:${item.phone}`}
                  aria-label={`${item.name} 전화 걸기`}
                  className="w-10 h-10 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </a>
              )}
              <a
                href={item.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.name} 카카오맵에서 보기`}
                className="w-10 h-10 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">map</span>
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
