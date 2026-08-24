import { NextResponse } from 'next/server';

/**
 * 카카오 로컬 API로 "지역 목록"을 채우는 모듈.
 *
 * 원래 계획은 공공데이터 ETL이었지만(§4.4~4.5, 문서 참고), 문화공공데이터광장
 * API 실제 규격이 아직 미확인 상태(§14-A)라 당장은 카카오로 대체한다.
 *
 * ★ 이 선택으로 바뀌는 약속: "이 지역 전체"라는 전수 목록이 아니라
 *   "구·카테고리당 최대 45건"이 된다 (카카오 카테고리 검색 자체 상한).
 *   45건에 걸리면 응답의 truncated: true로 표시하고, 화면에서 안내한다.
 *
 * 카카오 로컬 API는 "지역명"으로 검색할 수 없고 "좌표+반경"만 받는다.
 * 그래서 구청 주소를 먼저 좌표로 변환한 뒤, 그 지점을 중심으로 카테고리 검색을 돌린다.
 */

const ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json';
const CATEGORY_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/category.json';

/** 음식점. 카페만 따로 보고 싶으면 CE7 */
export const CATEGORY_GROUP_RESTAURANT = 'FD6';

/** 구 단위는 대개 이 반경 안에 다 들어온다. 큰 군 지역은 §14에 한계로 남긴다. */
const DEFAULT_RADIUS = 8000;

/** 카카오 카테고리 검색 자체 상한 — 페이지당 15건 × 최대 3페이지 */
const MAX_PAGES = 3;
const PAGE_SIZE = 15;

function authHeader(apiKey: string) {
  return { Authorization: `KakaoAK ${apiKey}` };
}

// ── 1. 시·군·구 중심좌표 — 주소 검색으로 얻고 오래 캐시한다 ──────

interface Center {
  lat: number;
  lng: number;
}

/** 좌표는 사실상 안 바뀌는 값이므로 TTL 없이 오래 들고 있는다. 서버 재시작 시에만 초기화. */
const centerCache = new Map<string, Center | null>();

/**
 * "서울 강남구" 같은 지역명을 좌표로 바꾼다.
 * 구청 주소 대신 "시도 시군구" 문자열 자체를 카카오 주소 검색에 넣으면
 * 그 행정구역을 대표하는 지점을 준다 — 별도 구청 주소 테이블을 관리할 필요가 없다.
 */
export async function getDistrictCenter(
  sidoName: string,
  sigunguName: string,
  apiKey: string
): Promise<Center | null> {
  const key = `${sidoName} ${sigunguName}`;
  if (centerCache.has(key)) return centerCache.get(key)!;

  const url = new URL(ADDRESS_SEARCH_URL);
  url.searchParams.set('query', key);

  const res = await fetch(url, { headers: authHeader(apiKey), cache: 'no-store' });
  if (!res.ok) {
    centerCache.set(key, null);
    return null;
  }

  const data = await res.json();
  const doc = data?.documents?.[0];
  const center = doc ? { lat: Number(doc.y), lng: Number(doc.x) } : null;

  centerCache.set(key, center);
  return center;
}

// ── 2. 표준 카테고리 매핑 — 카카오 category_name → 내부 9종 체계 ──

export type Category =
  | 'korean' | 'chinese' | 'japanese' | 'western'
  | 'asian' | 'snack' | 'cafe' | 'bar' | 'etc';

/**
 * 규칙 순서가 의미를 가진다 — "호프"가 "korean"보다 먼저 잡혀야 한다.
 * 새 규칙을 추가할 때 위치를 신경 쓸 것.
 */
const CATEGORY_RULES: [RegExp, Category][] = [
  [/카페|커피|제과|디저트|아이스크림|베이커리/, 'cafe'],
  [/호프|주점|술집|바\b|포차|통닭/, 'bar'],
  [/분식|김밥|떡볶이/, 'snack'],
  [/중식|중국/, 'chinese'],
  [/일식|초밥|스시|횟집|회집/, 'japanese'],
  [/양식|경양식|이탈리|프렌치|스테이크|피자|패밀리/, 'western'],
  [/베트남|태국|인도|동남아|아시안|외국/, 'asian'],
  [/한식|백반|국밥|고기|곰탕|칼국수|족발|보쌈/, 'korean'],
];

/**
 * 카카오 응답은 "음식점 > 한식 > 육류,고기"처럼 계층 문자열이다.
 * 마지막 항목만 뽑아 정규식 규칙에 태운다.
 */
export function toStandardCategory(kakaoCategoryName: string): Category {
  const leaf = kakaoCategoryName.split('>').pop()?.trim() ?? '';
  const compact = leaf.replace(/\s/g, '');
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(compact)) return cat;
  }
  return 'etc';
}

// ── 3. 지역 + 카테고리로 목록 조회 ───────────────────────────

export interface DistrictRestaurant {
  id: string; // 카카오 place id
  name: string;
  category: Category;
  rawCategoryName: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  placeUrl: string;
}

export interface DistrictListResult {
  items: DistrictRestaurant[];
  center: Center;
  /** 45건 상한에 걸렸는지 — true면 "더 있을 수 있어요" 안내 */
  truncated: boolean;
}

interface RawKakaoDoc {
  id: string;
  place_name: string;
  category_name: string;
  road_address_name: string;
  address_name: string;
  phone: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
}

function toDistrictRestaurant(doc: RawKakaoDoc): DistrictRestaurant {
  return {
    id: doc.id,
    name: doc.place_name,
    category: toStandardCategory(doc.category_name),
    rawCategoryName: doc.category_name,
    roadAddress: doc.road_address_name || null,
    jibunAddress: doc.address_name || null,
    phone: doc.phone || null,
    lat: Number(doc.y),
    lng: Number(doc.x),
    placeUrl: doc.place_url,
  };
}

/**
 * 시·도 + 시·군·구를 좌표로 바꾼 뒤, 그 지점 중심으로 최대 45건을 모은다.
 * 카테고리 필터는 응답을 받은 뒤 코드에서 거른다 —
 * 카카오 카테고리 검색은 "음식점 전체"만 걸러주지 "한식만" 같은 세부 필터는 없다.
 */
export async function fetchDistrictRestaurants(
  sidoName: string,
  sigunguName: string,
  apiKey: string,
  opts: { category?: Category; radius?: number } = {}
): Promise<DistrictListResult | null> {
  const center = await getDistrictCenter(sidoName, sigunguName, apiKey);
  if (!center) return null;

  const radius = opts.radius ?? DEFAULT_RADIUS;
  const collected: RawKakaoDoc[] = [];
  let isEnd = false;

  for (let page = 1; page <= MAX_PAGES && !isEnd; page++) {
    const url = new URL(CATEGORY_SEARCH_URL);
    url.searchParams.set('category_group_code', CATEGORY_GROUP_RESTAURANT);
    url.searchParams.set('x', String(center.lng));
    url.searchParams.set('y', String(center.lat));
    url.searchParams.set('radius', String(radius));
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(PAGE_SIZE));
    url.searchParams.set('sort', 'accuracy');

    const res = await fetch(url, { headers: authHeader(apiKey), cache: 'no-store' });
    if (!res.ok) break;

    const data = await res.json();
    collected.push(...(data.documents ?? []));
    isEnd = data.meta?.is_end !== false; // 명시적으로 false일 때만 계속
  }

  // 중복 제거 (드물지만 페이지 경계에서 겹칠 수 있다)
  const uniqueById = new Map(collected.map((d) => [d.id, d]));
  let items = Array.from(uniqueById.values()).map(toDistrictRestaurant);

  if (opts.category) {
    items = items.filter((r) => r.category === opts.category);
  }

  // 평점이 없으므로 유일하게 정직한 정렬 — 가나다순
  items.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return {
    items,
    center,
    truncated: collected.length >= MAX_PAGES * PAGE_SIZE,
  };
}

// ── 4. 짧은 서버 캐시 — 같은 구를 여러 사용자가 봐도 카카오 재호출 안 함 ──

const CACHE_TTL_MS = 10 * 60 * 1000; // 10분
const resultCache = new Map<
  string,
  { value: DistrictListResult; expiresAt: number }
>();

/**
 * 같은 (시도,시군구)를 향한 동시 요청이 카카오를 여러 번 부르지 않게 막는다.
 * page.tsx 쪽에서 findRestaurants/countRestaurants/countByCategory/getMeta를
 * Promise.all로 동시에 부르면, 캐시가 비어있는 첫 순간에는 넷 다 캐시 미스로
 * 보인다 — 이 Map이 없으면 그 넷이 카카오를 각자 따로 4번 부른다.
 */
const inFlight = new Map<string, Promise<DistrictListResult | null>>();

/**
 * 카테고리 없이(=전체) 받아서 캐시하고, 카테고리 필터는 항상 호출부에서
 * 메모리상으로 다시 적용한다. 그래야 "한식"과 "일식"을 각각 요청해도
 * 카카오를 두 번 부르지 않고 캐시 하나를 공유한다.
 */
async function loadDistrictSnapshot(
  sidoName: string,
  sigunguName: string,
  apiKey: string,
  radius?: number
): Promise<DistrictListResult | null> {
  const key = `${sidoName}|${sigunguName}`;

  const cached = resultCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const fresh = await fetchDistrictRestaurants(sidoName, sigunguName, apiKey, { radius });
    if (fresh) {
      resultCache.set(key, { value: fresh, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return fresh;
  })();

  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    inFlight.delete(key);
  }
}

export async function fetchDistrictRestaurantsCached(
  sidoName: string,
  sigunguName: string,
  apiKey: string,
  opts: { category?: Category; radius?: number } = {}
): Promise<DistrictListResult | null> {
  const snapshot = await loadDistrictSnapshot(sidoName, sigunguName, apiKey, opts.radius);
  if (!snapshot) return null;

  const items = opts.category
    ? snapshot.items.filter((r) => r.category === opts.category)
    : snapshot.items;

  return { ...snapshot, items };
}

/**
 * 상세 페이지용 — id로 단독 조회하는 카카오 API가 없으므로,
 * 그 id가 속한 (시도,시군구)를 같이 받아 캐시된 목록 안에서 찾는다.
 *
 * 목록 화면에서 클릭해 들어온 경우 십중팔구 캐시 히트라 카카오 호출이 없다.
 * 캐시가 만료됐거나(10분 지남) 직접 링크로 들어온 경우에만 한 번 다시 받는다.
 *
 * sido/sigungu 정보 없이는 원리상 이 id를 못 찾는다 — 호출부(상세 페이지)가
 * URL에 반드시 이 둘을 실어 보내야 한다. 이게 없으면 애초에 이 함수를 부르지 말고
 * "위치 정보가 없어 상세를 찾을 수 없다"로 처리할 것.
 */
export async function findDistrictRestaurantById(
  sidoName: string,
  sigunguName: string,
  placeId: string,
  apiKey: string
): Promise<DistrictRestaurant | null> {
  const snapshot = await loadDistrictSnapshot(sidoName, sigunguName, apiKey);
  if (!snapshot) return null;
  return snapshot.items.find((r) => r.id === placeId) ?? null;
}

/** 공통 에러 응답 — route.ts에서 재사용 */
export function districtErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: { code: 'DISTRICT_FETCH_FAILED', message } }, { status });
}
