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
    <section className="border-b border-[var(--ledger)] bg-[var(--paper)] pt-3 pb-4" role="group" aria-label="카테고리 필터">
      <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
        {categories.map((c) => {
          const isActive = selected.includes(c.category);
          if (c.count === 0) {
            return (
              <span
                key={c.category}
                aria-disabled="true"
                className="inline-flex flex-col items-center justify-center bg-transparent text-[var(--muted-ink)]/50 border border-[var(--ledger)] px-4 py-2 min-w-[70px] whitespace-nowrap shrink-0 opacity-50 cursor-not-allowed"
              >
                <span className="font-label text-sm font-medium">{c.label}</span>
                <span className="text-xs mt-0.5 tabular-nums">0</span>
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
                  ? "inline-flex flex-col items-center justify-center bg-[var(--index-red)]/5 text-[var(--index-red)] border border-[var(--index-red)] px-4 py-2 min-w-[70px] whitespace-nowrap shrink-0 active:scale-95 transition-colors relative"
                  : "inline-flex flex-col items-center justify-center bg-transparent text-[var(--muted-ink)] border border-[var(--ledger)] px-4 py-2 min-w-[70px] whitespace-nowrap shrink-0 hover:border-[var(--ink)] hover:text-[var(--ink)] active:scale-95 transition-colors"
              }
            >
              <span className={`font-label text-sm ${isActive ? "font-bold" : "font-medium"}`}>{c.label}</span>
              <span className={`text-xs mt-0.5 tabular-nums ${isActive ? "font-semibold" : ""}`}>{c.count}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
