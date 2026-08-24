import Link from "next/link";
import { redirect } from "next/navigation";
import {
  countByCategory,
  countRestaurants,
  DistrictLookupError,
  districtSlugToName,
  findRestaurants,
  getMeta,
} from "@/lib/db";
import { isCategory } from "@/lib/category";
import { sidoBySlug } from "@/lib/region";
import type { Category, CategoryCount, Restaurant } from "@/lib/types";
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

  // 카카오 전환(2단계) — 넷 다 독립적으로 fetchDistrictRestaurantsCached()를 부르지만,
  // 첫 호출(countRestaurants)이 lib/kakao-district.ts의 10분 캐시를 채워두기 때문에
  // 이어지는 세 호출은 실제 카카오 요청 없이 캐시만 읽는다.
  // 카카오 주소 검색 실패 등으로 DistrictLookupError가 나면 500으로 죽는 대신
  // "이 지역 정보를 불러오지 못했습니다" 안내로 처리한다.
  let total = 0;
  let page = 1;
  let lastPage = 1;
  let items: Restaurant[] = [];
  let categories: CategoryCount[] = [];
  let truncated = false;
  let loadError: string | null = null;

  try {
    total = await countRestaurants({ sido, sigungu: sigunguName, cats });
    lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(Math.max(1, Number(sp.page ?? 1) || 1), lastPage);

    items = await findRestaurants({ sido, sigungu: sigunguName, cats, page, pageSize: PAGE_SIZE });
    categories = await countByCategory({ sido, sigungu: sigunguName });
    const meta = await getMeta(sido, sigunguName);
    // ⚠️ 이제 "이 지역 전체"가 아니라 "카카오가 모아준 최대 45건"이다. truncated:true면
    // 45건 상한에 걸려 더 있을 수 있다는 뜻 — 화면에서 숨기지 않는다(아래 배너).
    truncated = meta.truncated;
  } catch (err) {
    loadError =
      err instanceof DistrictLookupError
        ? "이 지역 정보를 불러오지 못했습니다"
        : "알 수 없는 오류로 정보를 불러오지 못했습니다";
  }

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
        {loadError ? (
          // 카카오 주소 검색 실패 등 — 500으로 죽이지 않고 재시도/다른 지역 이동 경로만 준다.
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <span
              className="material-symbols-outlined text-6xl text-outline-variant mb-6"
              style={{ fontVariationSettings: "'wght' 200" }}
            >
              wifi_off
            </span>
            <h2 className="text-xl font-bold font-headline text-on-surface mb-2">{loadError}</h2>
            <p className="text-sm text-on-surface-variant mb-8 max-w-[250px] leading-relaxed">
              잠시 후 다시 시도하거나
              <br />
              다른 지역에서 찾아보세요
            </p>
            <div className="w-full max-w-[280px] flex flex-col space-y-3">
              <Link
                href={basePath}
                className="w-full h-12 rounded-lg border border-primary text-primary font-label font-semibold flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
              >
                다시 시도
              </Link>
              <Link
                href={`/${sidoSlug}`}
                className="w-full h-12 rounded-lg border border-outline text-on-surface font-label font-semibold flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95"
              >
                다른 지역 보기
              </Link>
            </div>
          </div>
        ) : (
          <>
            {truncated && (
              <div className="bg-error-container text-on-error-container text-xs font-label text-center py-2 px-4">
                ⚠ 카카오 검색 결과가 많아 최대 45건까지만 표시 중이에요. 전체 목록이 아닐 수 있어요.
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
                    <RestaurantCard key={r.id} restaurant={r} sidoSlug={sidoSlug} sigunguSlug={sigunguSlug} />
                  ))}
                </ul>
                <Pagination basePath={basePath} cats={cats} page={page} lastPage={lastPage} />
              </>
            )}
          </>
        )}

        {/* Footer — 이제 문화공공데이터광장이 아니라 카카오 로컬 API 출처. 전수 목록이 아니라
            "최대 45건"이라는 걸 여기서도 숨기지 않는다. */}
        <div className="w-full mt-auto flex flex-col items-center py-6 px-4 text-center bg-surface-container-lowest">
          <p className="font-body text-[10px] leading-relaxed text-on-surface-variant">
            © 동네한끼. 카카오 로컬 API 기반 식당 정보 (구·카테고리당 최대 45건, 전수 목록 아님).
          </p>
          {!loadError && (
            <div className="flex gap-2 mt-1">
              <span className="font-body text-[10px] text-on-surface-variant">실시간 조회</span>
              <span className="font-body text-[10px] text-on-surface-variant">·</span>
              <span className="font-body text-[10px] text-primary">출처 카카오맵</span>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
