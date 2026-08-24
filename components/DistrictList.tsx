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
          <span className="material-symbols-outlined text-outline">search</span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-surface-container text-on-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-on-surface-variant/70 font-body text-base touch-target outline-none transition-shadow"
          placeholder="시/군/구 검색"
          type="text"
        />
      </div>

      <div className="bg-surface">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-on-surface-variant font-body">
            &ldquo;{query}&rdquo;와 일치하는 지역이 없어요
          </p>
        ) : (
          /* 좁은 화면에선 세로 목록(테두리로 행 구분), 넓은 화면에선 카드형 그리드로 —
             큰 화면에서 목록 하나가 옆으로 쭉 늘어나 오른쪽이 텅 비어 보이는 걸 막는다. */
          <ul
            className="flex flex-col border-t border-outline-variant md:border-t-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3"
            role="listbox"
          >
            {filtered.map((d) => (
              <li
                key={d.slug}
                className="border-b border-outline-variant/60 md:border md:rounded-lg md:overflow-hidden"
              >
                <Link
                  href={`/${sidoSlug}/${d.slug}`}
                  role="option"
                  className="w-full flex items-center justify-between px-4 py-3 touch-target hover:bg-surface-container-low active:bg-surface-container transition-colors text-left"
                >
                  <span className="font-body text-base text-on-surface">{d.name}</span>
                  <span className="font-label text-sm text-on-surface-variant">
                    {d.count.toLocaleString("ko-KR")}곳
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
