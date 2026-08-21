import Link from "next/link";
import { redirect } from "next/navigation";
import { countByCategory, countRestaurants, districtSlugToName, findRestaurants, getMeta } from "@/lib/db";
import { isCategory } from "@/lib/category";
import { sidoBySlug } from "@/lib/region";
import type { Category } from "@/lib/types";
import CategoryChips from "@/components/CategoryChips";
import Pagination from "@/components/Pagination";
import RestaurantCard from "@/components/RestaurantCard";
import EmptyState from "@/components/EmptyState";

const PAGE_SIZE = 20;

// F2(카테고리 칩) + F3(식당 목록) — Stitch "식당 목록 - 서울 강남구 일식" 화면을 그대로 포팅.
// 결과 0건일 때는 같은 셸 안에서 F6("결과 없음") 블록으로 전환한다.
export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ sido: string; sigungu: string }>;
  searchParams: Promise<{ cat?: string; page?: string }>;
}) {
  const { sido: sidoSlug, sigungu: sigunguSlug } = await params;
  const sp = await searchParams;

  const sido = sidoBySlug(sidoSlug);
  if (!sido) redirect("/"); // PRD §6: 잘못된 슬러그 → 선택 화면 폴백

  const sigunguName = districtSlugToName(sido, sigunguSlug);
  if (!sigunguName) redirect(`/${sidoSlug}`);

  const cats = (sp.cat ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isCategory) as Category[]; // 잘못된 카테고리 슬러그는 무시(에러 아님)

  const basePath = `/${sidoSlug}/${sigunguSlug}`;
  const total = countRestaurants({ sido, sigungu: sigunguName, cats });
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page ?? 1) || 1), lastPage);

  const items = findRestaurants({ sido, sigungu: sigunguName, cats, page, pageSize: PAGE_SIZE });
  const categories = countByCategory({ sido, sigungu: sigunguName });
  const meta = getMeta();

  const isStale =
    (Date.now() - new Date(meta.snapshotDate).getTime()) / (1000 * 60 * 60 * 24) > 60;

  return (
    <>
      {/* Header (Shared Component Mapping) */}
      <header className="w-full top-0 sticky z-40 bg-surface border-b border-outline-variant flex flex-col">
        <div className="flex items-center justify-between px-4 h-16 w-full">
          <Link
            href={`/${sidoSlug}`}
            aria-label="뒤로가기"
            className="text-on-surface-variant hover:bg-surface-container transition-colors rounded-full p-2 active:opacity-80 flex-shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="font-headline text-on-surface text-lg font-bold flex-1 text-center truncate px-4">동네한끼</h1>
          <span className="w-9 flex-shrink-0" aria-hidden="true" />
        </div>
        {/* Breadcrumb / Active Filters */}
        <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center bg-surface-container-high text-on-surface rounded-full px-3 py-1.5 text-sm font-label whitespace-nowrap border border-outline-variant/30">
            <span>
              {sido} · {sigunguName}
            </span>
            <Link href="/" aria-label="필터 제거" className="ml-2 text-on-surface-variant hover:text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {isStale && (
          <div className="bg-error-container text-on-error-container text-xs font-label text-center py-2 px-4">
            ⚠ 정보가 오래되었습니다 (기준일 {meta.snapshotDate})
          </div>
        )}

        <CategoryChips basePath={basePath} categories={categories} selected={cats} />

        {/* List Header */}
        <div className="px-4 py-4 flex justify-between items-center bg-background border-b border-surface-variant">
          <div className="text-on-surface">
            <span className="font-label font-bold">총 {total.toLocaleString("ko-KR")}곳</span>
          </div>
          <span className="flex items-center text-sm font-label text-on-surface-variant">
            가나다순
            <span className="material-symbols-outlined text-[18px] ml-1">arrow_drop_down</span>
          </span>
        </div>

        {total === 0 ? (
          <EmptyState basePath={basePath} sigunguName={sigunguName} selectedCats={cats} sidoSlug={sidoSlug} />
        ) : (
          <>
            <ul className="flex flex-col">
              {items.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </ul>
            <Pagination basePath={basePath} cats={cats} page={page} lastPage={lastPage} />
          </>
        )}

        {/* Footer */}
        <div className="w-full mt-auto flex flex-col items-center py-6 px-4 text-center bg-surface-container-lowest">
          <p className="font-body text-[10px] leading-relaxed text-on-surface-variant">
            © 동네한끼. 공공데이터포털 기반 식당 전수 정보.
          </p>
          <div className="flex gap-2 mt-1">
            <span className="font-body text-[10px] text-on-surface-variant">데이터 기준일: {meta.snapshotDate}</span>
            <span className="font-body text-[10px] text-on-surface-variant">·</span>
            <span className="font-body text-[10px] text-primary">출처 문화공공데이터광장</span>
          </div>
        </div>
      </main>
    </>
  );
}
