import Link from "next/link";
import type { Category } from "@/lib/types";
import { buildListHref } from "@/lib/url";

// F3 페이지네이션 — Stitch 목록 화면과 동일한 "‹ 1 2 3 … N ›" 형태.
export default function Pagination({
  basePath,
  cats,
  page,
  lastPage,
}: {
  basePath: string;
  cats: Category[];
  page: number;
  lastPage: number;
}) {
  if (lastPage <= 1) return null;

  const pages = new Set<number>([1, lastPage, page - 1, page, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= lastPage).sort((a, b) => a - b);

  const href = (n: number) => buildListHref(basePath, { cats, page: n });

  return (
    <nav aria-label="페이지네이션" className="py-8 flex justify-center items-center gap-1">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          aria-label="이전 페이지"
          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </Link>
      ) : (
        <span className="w-8 h-8 flex items-center justify-center text-outline-variant">
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </span>
      )}

      {sorted.map((n, i) => {
        const prev = sorted[i - 1];
        const showEllipsis = prev !== undefined && n - prev > 1;
        return (
          <span key={n} className="flex items-center gap-1">
            {showEllipsis && <span className="w-8 h-8 flex items-center justify-center text-on-surface-variant">...</span>}
            {n === page ? (
              <span className="w-8 h-8 flex items-center justify-center font-label text-sm font-bold bg-accent text-white rounded-full">
                {n}
              </span>
            ) : (
              <Link
                href={href(n)}
                className="w-8 h-8 flex items-center justify-center font-label text-sm text-on-surface-variant hover:bg-surface-container rounded-full"
              >
                {n}
              </Link>
            )}
          </span>
        );
      })}

      {page < lastPage ? (
        <Link
          href={href(page + 1)}
          aria-label="다음 페이지"
          className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full"
        >
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </Link>
      ) : (
        <span className="w-8 h-8 flex items-center justify-center text-outline-variant">
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </span>
      )}
    </nav>
  );
}
