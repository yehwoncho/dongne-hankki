import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/category";
import type { Restaurant } from "@/lib/types";

// F3 식당 카드 — Stitch 목록 화면 <li> 마크업 그대로.
export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <li className="px-4 py-5 border-b border-surface-variant flex justify-between items-start hover:bg-surface-container-lowest transition-colors">
      <Link href={`/restaurant/${restaurant.id}`} className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-bold text-on-surface leading-tight">{restaurant.name}</h2>
          <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
            {CATEGORY_LABELS[restaurant.category]}
          </span>
        </div>
        <div className="flex items-start mt-2">
          <span className="material-symbols-outlined text-[16px] text-outline mr-1.5 mt-0.5">map</span>
          <p className="text-sm text-on-surface-variant font-body">{restaurant.roadAddress ?? "주소 정보 없음"}</p>
        </div>
        <div className="flex items-center mt-1">
          <span className="material-symbols-outlined text-[16px] text-outline mr-1.5">call</span>
          <p className={`text-sm font-body ${restaurant.phone ? "text-on-surface-variant" : "text-outline"}`}>
            {restaurant.phone ?? "전화번호 없음"}
          </p>
        </div>
      </Link>
      <Link
        href={`/restaurant/${restaurant.id}`}
        aria-label={`${restaurant.name} 상세보기`}
        className="flex-shrink-0 w-10 h-10 rounded-full border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">location_on</span>
      </Link>
    </li>
  );
}
