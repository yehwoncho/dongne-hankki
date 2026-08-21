import Link from "next/link";
import type { Category, CategoryCount } from "@/lib/types";
import { buildListHref } from "@/lib/url";

// F2 카테고리 칩 — Stitch 목록 화면의 칩 마크업을 그대로 포팅.
// 0건 카테고리는 숨기지 않고 비활성(aria-disabled)으로 표시한다 (PRD F2 수용기준).
export default function CategoryChips({
  basePath,
  categories,
  selected,
}: {
  basePath: string;
  categories: CategoryCount[];
  selected: Category[];
}) {
  return (
    <section className="border-b border-surface-variant bg-surface-bright pt-3 pb-4" role="group" aria-label="카테고리 필터">
      <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
        {categories.map((c) => {
          const isActive = selected.includes(c.category);
          if (c.count === 0) {
            return (
              <span
                key={c.category}
                aria-disabled="true"
                className="inline-flex flex-col items-center justify-center bg-surface-container text-outline border border-outline-variant/20 rounded-lg px-4 py-2 min-w-[70px] whitespace-nowrap shrink-0 opacity-40 cursor-not-allowed"
              >
                <span className="font-label text-sm font-medium">{c.label}</span>
                <span className="text-xs mt-0.5">0</span>
              </span>
            );
          }
          const nextCats = isActive
            ? selected.filter((s) => s !== c.category)
            : [...selected, c.category];
          return (
            <Link
              key={c.category}
              href={buildListHref(basePath, { cats: nextCats })}
              aria-pressed={isActive}
              className={
                isActive
                  ? "inline-flex flex-col items-center justify-center bg-accent/10 text-accent border border-accent rounded-lg px-4 py-2 min-w-[70px] whitespace-nowrap shrink-0 active:scale-95 transition-transform relative"
                  : "inline-flex flex-col items-center justify-center bg-surface-container text-on-surface-variant border border-outline-variant/20 rounded-lg px-4 py-2 min-w-[70px] whitespace-nowrap shrink-0 active:scale-95 transition-transform"
              }
            >
              <span className={`font-label text-sm ${isActive ? "font-bold" : "font-medium"}`}>{c.label}</span>
              <span className={`text-xs mt-0.5 ${isActive ? "font-semibold" : "text-outline"}`}>{c.count}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
