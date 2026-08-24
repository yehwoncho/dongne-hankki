// PRD §8 API 계약과 동일한 시그니처의 조회 함수 모음.
//
// ⚠️ 카카오 전환 (2단계, WIRE_KAKAO_DISTRICT.md): findRestaurants / countRestaurants /
// countByCategory / getMeta 넷은 이제 mock-data.ts가 아니라 lib/kakao-district.ts를 통해
// 카카오 로컬 API 결과를 받는다. 넷 다 각자 fetchDistrictRestaurantsCached()를 독립적으로
// 부르는 구조를 그대로 유지한다 — kakao-district.ts의 in-flight dedupe + 10분 캐시 덕분에
// 실제 카카오 호출은 (같은 sido/sigungu 기준) 1번만 나간다.
//
// mock-data.ts는 지우지 않았다. getDistricts()(구·군 슬러그↔이름 정적 테이블 — 카카오는
// "행정구역 목록" API가 없어서 계속 필요)와 getRegions()/getRegionsForSido()(지역 "선택"
// 화면용 카운트 — 이번 전환 범위 밖)는 그대로 mock-data를 쓴다. getMeta()도 sido/sigungu
// 없이 부르면(전국 단위 화면들) mock 전국 메타로 폴백한다. 나중에 로컬 개발 중
// KAKAO_REST_API_KEY 없이 목록 화면을 보고 싶으면 findRestaurants 등도 getAllRestaurants()
// 폴백으로 다시 연결할 수 있다.
//
// ⚠️ total/count의 의미가 바뀌었다: 더 이상 "이 구·군의 전체 식당 수"가 아니라 "카카오가
// 이번에 모아준 최대 45건(카카오 카테고리 검색 자체 상한) 중 개수"다. getMeta()의
// truncated:true는 45건 상한에 걸려 더 있을 수 있다는 뜻 — 화면에서 숨기지 않는다.

import { CATEGORY_LABELS, CATEGORY_ORDER } from "./category";
import { getAllRestaurants, getDistricts, SNAPSHOT_DATE } from "./mock-data";
import { fetchDistrictRestaurantsCached, type DistrictRestaurant } from "./kakao-district";
import { SIDO_LIST } from "./region";
import type { Category, CategoryCount, RegionOption, Restaurant, Sido } from "./types";

function slugifyDistrict(sido: Sido, name: string): string {
  const found = getDistricts(sido).find((d) => d.name === name);
  return found?.slug ?? name;
}

// 지역 "선택" 화면(F1)용 — 이번 전환 범위 밖. 전국/시도 단위로 카카오를 다 돌리려면
// 별도 설계가 필요해서 당분간 mock 카운트를 그대로 보여준다.
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

// ── 카카오 전환 (2단계) ──────────────────────────────────────────

/**
 * 카카오 경로에서 나는 에러 — 구·군 목록 화면이 500으로 죽지 않고
 * "이 지역 정보를 불러오지 못했습니다" 같은 안내로 처리할 수 있게 code로 원인을 구분한다.
 */
export class DistrictLookupError extends Error {
  code: "MISSING_REGION" | "NO_API_KEY" | "FETCH_FAILED";
  constructor(code: DistrictLookupError["code"], message: string) {
    super(message);
    this.name = "DistrictLookupError";
    this.code = code;
  }
}

function requireApiKey(): string {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new DistrictLookupError("NO_API_KEY", "KAKAO_REST_API_KEY가 설정되지 않았습니다");
  return key;
}

// 카카오는 좌표+반경만 받는다 — 시·도/시·군·구 중 하나라도 없으면 검색 자체가 불가능하다.
// mock 시절의 "지역 필터 없이 전국 조회" 모드는 카카오 경로에서는 지원하지 않는다.
function requireRegion(sido: Sido | null, sigungu: string | null): { sido: Sido; sigungu: string } {
  if (!sido || !sigungu) {
    throw new DistrictLookupError("MISSING_REGION", "지역(시·도/시·군·구)이 지정되지 않았습니다");
  }
  return { sido, sigungu };
}

function toRestaurant(d: DistrictRestaurant, sido: Sido, sigungu: string): Restaurant {
  return {
    id: d.id,
    name: d.name,
    sido,
    sigungu,
    category: d.category,
    rawBizType: d.rawCategoryName,
    roadAddress: d.roadAddress,
    jibunAddress: d.jibunAddress,
    phone: d.phone,
    lat: d.lat,
    lng: d.lng,
    intro: null, // 카카오는 소개 문구를 안 준다 — mock의 "손맛" 템플릿 문구도 이제 없다
    snapshotDate: new Date().toISOString().slice(0, 10), // 스냅샷이 아니라 실시간 조회 — "오늘"로 표기
  };
}

interface QueryParams {
  sido: Sido | null;
  sigungu: string | null; // 정규화된 한글 지역명 (슬러그 아님)
  cats: Category[];
}

export async function findRestaurants(
  params: QueryParams & { page: number; pageSize: number }
): Promise<Restaurant[]> {
  const { sido, sigungu } = requireRegion(params.sido, params.sigungu);
  const apiKey = requireApiKey();

  const snapshot = await fetchDistrictRestaurantsCached(sido, sigungu, apiKey);
  if (!snapshot) {
    throw new DistrictLookupError("FETCH_FAILED", `${sido} ${sigungu} 정보를 불러오지 못했습니다`);
  }

  // cats는 다중 선택(OR) — kakao-district.ts는 단일 카테고리만 필터링해주므로
  // 카테고리 없이 받은 전체 스냅샷에 기존 matches()와 동일한 규칙을 여기서 직접 적용한다.
  const filtered = snapshot.items.filter(
    (r) => params.cats.length === 0 || params.cats.includes(r.category)
  );
  // 가나다순은 kakao-district.ts에서 이미 정렬해서 준다.
  const start = (params.page - 1) * params.pageSize;
  return filtered.slice(start, start + params.pageSize).map((r) => toRestaurant(r, sido, sigungu));
}

export async function countRestaurants(params: QueryParams): Promise<number> {
  const { sido, sigungu } = requireRegion(params.sido, params.sigungu);
  const apiKey = requireApiKey();

  const snapshot = await fetchDistrictRestaurantsCached(sido, sigungu, apiKey);
  if (!snapshot) {
    throw new DistrictLookupError("FETCH_FAILED", `${sido} ${sigungu} 정보를 불러오지 못했습니다`);
  }

  return snapshot.items.filter(
    (r) => params.cats.length === 0 || params.cats.includes(r.category)
  ).length;
}

// 카테고리 필터를 빼고 센다 — 필터를 적용해 세면 선택 카테고리 외 칩이 전부 0이 되어
// 다른 카테고리로 이동할 수 없게 된다 (PRD §8의 흔한 버그 경고).
export async function countByCategory(params: Omit<QueryParams, "cats">): Promise<CategoryCount[]> {
  const { sido, sigungu } = requireRegion(params.sido, params.sigungu);
  const apiKey = requireApiKey();

  const snapshot = await fetchDistrictRestaurantsCached(sido, sigungu, apiKey);
  if (!snapshot) {
    throw new DistrictLookupError("FETCH_FAILED", `${sido} ${sigungu} 정보를 불러오지 못했습니다`);
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    count: snapshot.items.filter((r) => r.category === category).length,
  }));
}

// ⚠️ 카카오 전환(WIRE_DETAIL_PAGE.md) 이후 더 이상 이 경로에서 쓰이지 않는다 —
// app/restaurant/[id]/page.tsx와 app/api/restaurants/[id]/route.ts는 이제
// lib/kakao-district.ts의 findDistrictRestaurantById()를 직접 호출한다(카카오엔
// "id로 상세 조회" API가 없어서 sido/sigungu 슬러그를 같이 받아 캐시된 목록에서 찾는다).
// 지우지 않은 이유: 로컬 개발 중 KAKAO_REST_API_KEY 없이 mock 데이터로 상세 페이지를
// 보고 싶을 때 폴백으로 다시 연결할 수 있게.
export function getRestaurantById(id: string): Restaurant | null {
  return getAllRestaurants().find((r) => r.id === id) ?? null;
}

/**
 * sido/sigungu 없이 부르면(전국/시도 단위 화면 — 이번 전환 범위 밖) 기존 mock 전국 메타를
 * 그대로 반환한다. (sido, sigungu)를 넘기면(구·군 목록 화면) 카카오 기반 실시간 메타를 준다.
 * truncated는 45건 상한에 걸렸는지 — mock 경로는 항상 false.
 */
export async function getMeta(
  sido?: Sido | null,
  sigungu?: string | null
): Promise<{ snapshotDate: string; totalCount: number; truncated: boolean }> {
  if (!sido || !sigungu) {
    return { snapshotDate: SNAPSHOT_DATE, totalCount: getAllRestaurants().length, truncated: false };
  }

  const apiKey = requireApiKey();
  const snapshot = await fetchDistrictRestaurantsCached(sido, sigungu, apiKey);
  if (!snapshot) {
    throw new DistrictLookupError("FETCH_FAILED", `${sido} ${sigungu} 정보를 불러오지 못했습니다`);
  }

  return {
    // 카카오는 "스냅샷 기준일" 개념이 없다 — 매 호출이 그 시점의 실시간 결과라 "오늘"로 둔다.
    snapshotDate: new Date().toISOString().slice(0, 10),
    totalCount: snapshot.items.length,
    truncated: snapshot.truncated,
  };
}

export function districtSlugToName(sido: Sido, slug: string): string | null {
  return getDistricts(sido).find((d) => d.slug === slug)?.name ?? null;
}

export function districtNameToSlug(sido: Sido, name: string): string {
  return slugifyDistrict(sido, name);
}
