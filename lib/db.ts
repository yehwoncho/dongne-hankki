// PRD §8 API 계약과 동일한 시그니처의 조회 함수 모음.
// 지금은 lib/mock-data.ts의 인메모리 배열을 필터링하지만, 실 ETL이 Postgres에 적재되면
// 이 파일 내부만 Drizzle 쿼리로 바꾸면 된다 (호출부인 API 라우트는 그대로 둬도 됨).

import { CATEGORY_LABELS, CATEGORY_ORDER } from "./category";
import { getAllRestaurants, getDistricts, SNAPSHOT_DATE } from "./mock-data";
import { SIDO_LIST } from "./region";
import type { Category, CategoryCount, RegionOption, Restaurant, Sido } from "./types";

function slugifyDistrict(sido: Sido, name: string): string {
  const found = getDistricts(sido).find((d) => d.name === name);
  return found?.slug ?? name;
}

export function getRegions(): RegionOption[] {
  const all = getAllRestaurants();
  return SIDO_LIST.map(({ sido, slug }) => ({
    slug,
    name: sido,
    count: all.filter((r) => r.sido === sido).length,
  })).filter((r) => r.count > 0); // 0건인 지역은 응답에서 제외 (PRD F1)
}

export function getRegionsForSido(sido: Sido): RegionOption[] {
  const all = getAllRestaurants().filter((r) => r.sido === sido);
  return getDistricts(sido)
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      count: all.filter((r) => r.sigungu === d.name).length,
    }))
    .filter((r) => r.count > 0);
}

interface QueryParams {
  sido: Sido | null;
  sigungu: string | null; // 정규화된 한글 지역명 (슬러그 아님)
  cats: Category[];
}

function matches(r: Restaurant, p: QueryParams): boolean {
  if (p.sido && r.sido !== p.sido) return false;
  if (p.sigungu && r.sigungu !== p.sigungu) return false;
  if (p.cats.length > 0 && !p.cats.includes(r.category)) return false;
  return true;
}

export function findRestaurants(
  params: QueryParams & { page: number; pageSize: number }
): Restaurant[] {
  const filtered = getAllRestaurants().filter((r) => matches(r, params));
  // 기본 정렬: 상호명 가나다순 (PRD §5.4 — 평점이 없으므로 추천순 없음)
  filtered.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const start = (params.page - 1) * params.pageSize;
  return filtered.slice(start, start + params.pageSize);
}

export function countRestaurants(params: QueryParams): number {
  return getAllRestaurants().filter((r) => matches(r, params)).length;
}

// 카테고리 필터를 뺴고 센다 — 필터를 적용해 세면 선택 카테고리 외 칩이 전부 0이 되어
// 다른 카테고리로 이동할 수 없게 된다 (PRD §8의 흔한 버그 경고).
export function countByCategory(params: Omit<QueryParams, "cats">): CategoryCount[] {
  const base = getAllRestaurants().filter((r) => matches(r, { ...params, cats: [] }));
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    count: base.filter((r) => r.category === category).length,
  }));
}

export function getRestaurantById(id: string): Restaurant | null {
  return getAllRestaurants().find((r) => r.id === id) ?? null;
}

export function getMeta(): { snapshotDate: string; totalCount: number } {
  return { snapshotDate: SNAPSHOT_DATE, totalCount: getAllRestaurants().length };
}

export function districtSlugToName(sido: Sido, slug: string): string | null {
  return getDistricts(sido).find((d) => d.slug === slug)?.name ?? null;
}

export function districtNameToSlug(sido: Sido, name: string): string {
  return slugifyDistrict(sido, name);
}
