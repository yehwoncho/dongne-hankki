"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RegionOption } from "@/lib/types";

// F1② 시·군·구 선택 리스트 — 검색창 입력에 따라 클라이언트에서 즉시 필터링.
export default function DistrictList({
  sidoSlug,
  districts,
}: {
  sidoSlug: string;
  districts: RegionOption[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return districts;
    return districts.filter((d) => d.name.includes(q));
  }, [query, districts]);

  return (
    <>
      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-[var(--muted-ink)]">search</span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white text-[var(--ink)] border border-[var(--ledger)] rounded-md focus:ring-2 focus:ring-[var(--index-red)] placeholder:text-[var(--muted-ink)]/70 font-body text-base touch-target outline-none transition-colors"
          placeholder="시/군/구 검색"
          type="text"
        />
      </div>

      <div>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted-ink)] font-body">
            &ldquo;{query}&rdquo;와 일치하는 지역이 없어요
          </p>
        ) : (
          /* 랜딩 지역 리스트와 동일한 신문 단(段) 장부 레이아웃 — 넓은 화면에선 여러 열로
             흐르되 각 행은 얇은 구분선 + 호버 시 좌측 red 탭만 반응하는 단일 리스트 행. */
          <ul className="columns-1 md:columns-2 lg:columns-3 gap-x-8" role="listbox">
            {filtered.map((d) => (
              <li key={d.slug} className="break-inside-avoid">
                <Link
                  href={`/${sidoSlug}/${d.slug}`}
                  role="option"
                  className="group flex items-center justify-between gap-4 py-4 pl-3 -ml-3 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors touch-target"
                >
                  <span className="font-bold text-[var(--ink)] text-base font-body">{d.name}</span>
                  <span className="flex items-center gap-3 flex-shrink-0">
                    <span className="tabular-nums text-sm text-[var(--muted-ink)] font-label">
                      {d.count.toLocaleString("ko-KR")}곳
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-[var(--muted-ink)] group-hover:text-[var(--ink)] transition-colors">
                      chevron_right
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
