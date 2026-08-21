// F7 "내 주변 맛집" — 카카오 로컬 API 연동 (PRD v0.2 §4.6, §7, §8).
// ⚠️ 카카오 개발자 앱 등록·REST API 키 발급(§10 구현순서 10번)이 아직 없는 상태라,
// KAKAO_REST_API_KEY가 없으면 화면 검증용 목(mock) 데이터로 폴백한다.
// lib/mock-data.ts와 동일한 원칙: 실제 키가 생기면 이 파일의 fetchNearby() 내부만
// 실호출 분기로 정리하면 되고, 호출부(app/api/nearby/route.ts)는 그대로 둔다.

import { toCategory } from "./category";
import type { Category, KakaoNearbyItem } from "./types";

const KAKAO_CATEGORY_URL = "https://dapi.kakao.com/v2/local/search/category.json";
const CATEGORY_GROUP_CODE = "FD6"; // 음식점. 카페 별도 토글 시 CE7 (§4.6) — v1은 음식점만
const PAGE_SIZE = 15;
const MAX_PAGES = 3; // 45건 상한 (§4.6)

// 카카오 category_name("음식점 > 한식 > 육류,고기")의 마지막 계층을 §5.3 규칙에 그대로 태운다.
export function kakaoCategoryToStandard(categoryName: string): Category {
  const leaf = categoryName.split(">").pop()?.trim() ?? "";
  return toCategory(leaf);
}

interface KakaoDocument {
  id: string;
  place_name: string;
  category_name: string;
  road_address_name: string;
  phone: string;
  x: string; // 경도(lng), 카카오는 x/y로 준다
  y: string; // 위도(lat)
  distance: string;
  place_url: string;
}

function toNearbyItem(doc: KakaoDocument): KakaoNearbyItem {
  return {
    kakaoId: doc.id,
    name: doc.place_name,
    category: kakaoCategoryToStandard(doc.category_name),
    rawCategoryName: doc.category_name,
    roadAddress: doc.road_address_name || null,
    phone: doc.phone || null,
    lat: Number(doc.y),
    lng: Number(doc.x),
    distanceMeters: Number(doc.distance),
    placeUrl: doc.place_url,
  };
}

interface NearbyQuery {
  lat: number;
  lng: number;
  radius: number;
}

interface NearbyResult {
  items: KakaoNearbyItem[];
  truncated: boolean;
}

// 실호출 — 페이지 최대 3장(45건 상한)까지 순차 조회한다.
async function fetchFromKakao(
  { lat, lng, radius }: NearbyQuery,
  apiKey: string,
  signal: AbortSignal
): Promise<NearbyResult> {
  const items: KakaoNearbyItem[] = [];
  let truncated = false;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${KAKAO_CATEGORY_URL}?category_group_code=${CATEGORY_GROUP_CODE}&x=${lng}&y=${lat}&radius=${radius}&sort=distance&page=${page}&size=${PAGE_SIZE}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal,
    });
    if (!res.ok) throw new Error(`kakao ${res.status}`);

    const data = (await res.json()) as { documents: KakaoDocument[]; meta: { is_end: boolean } };
    items.push(...data.documents.map(toNearbyItem));

    if (data.meta.is_end) break;
    if (page === MAX_PAGES) truncated = true; // 3페이지 다 채웠는데 더 있다 = 45건 상한에 걸림
  }

  return { items, truncated };
}

// ⚠️ 목(mock) 폴백 — 키 없이 화면을 검증하기 위한 결정론적 생성기.
// mock-data.ts의 mulberry32 PRNG를 그대로 재사용(좌표 반올림값으로 seed 고정 →
// 같은 위치·반경 재조회 시 결과가 흔들리지 않는다).
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MOCK_PREFIX = [
  "행복", "다정", "고향", "전통", "황금", "진심", "옛날", "정든", "화목", "다솜",
  "보람", "은은한", "정성", "별빛", "다온", "소담", "해맑은", "넉넉", "단골", "제일",
];
const MOCK_SUFFIX: Record<Category, string[]> = {
  korean: ["식당", "밥상", "백반", "국밥"],
  chinese: ["반점", "중화요리"],
  japanese: ["스시", "초밥", "라멘", "이자카야"],
  western: ["파스타", "스테이크하우스", "피자"],
  asian: ["쌀국수", "커리하우스"],
  snack: ["분식", "떡볶이"],
  cafe: ["카페", "베이커리", "커피"],
  bar: ["포차", "호프", "펍"],
  etc: ["푸드", "다이닝"],
};
const MOCK_CATEGORIES: Category[] = [
  "korean", "cafe", "japanese", "snack", "chinese", "western", "bar", "asian", "etc",
];
const MOCK_STREETS = ["중앙로", "역전로", "번영로", "문화로", "공원로"];

// 두 좌표 간 거리(m) — 하버사인 공식. mock 카드의 distanceMeters를 실제 지터 좌표와 맞추기 위함.
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateMockNearby({ lat, lng, radius }: NearbyQuery): NearbyResult {
  // 좌표를 3자리(약 100m)로 반올림해 seed 고정 — 같은 동네에서 재조회해도 목록이 안 흔들린다.
  const rand = mulberry32(hashSeed(`${lat.toFixed(3)},${lng.toFixed(3)},${radius}`));
  const count = Math.min(45, Math.round(12 + rand() * 33));

  const items: KakaoNearbyItem[] = [];
  for (let i = 0; i < count; i++) {
    const category = MOCK_CATEGORIES[Math.floor(rand() * MOCK_CATEGORIES.length)];
    const suffixes = MOCK_SUFFIX[category];
    const name = `${MOCK_PREFIX[Math.floor(rand() * MOCK_PREFIX.length)]} ${suffixes[Math.floor(rand() * suffixes.length)]}`;
    // 반경 내부에 균등 분포하도록 극좌표로 지터
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * radius; // sqrt로 중심 쏠림 방지
    const dLat = (dist * Math.cos(angle)) / 111320;
    const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const itemLat = lat + dLat;
    const itemLng = lng + dLng;
    const hasPhone = rand() > 0.3;

    items.push({
      kakaoId: `mock-${i}-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`,
      name,
      category,
      rawCategoryName: `음식점 > ${name}`,
      roadAddress: `${MOCK_STREETS[Math.floor(rand() * MOCK_STREETS.length)]} ${Math.floor(rand() * 90) + 1}`,
      phone: hasPhone
        ? `0${rand() > 0.5 ? "2" : "31"}-${Math.floor(rand() * 900) + 100}-${String(Math.floor(rand() * 10000)).padStart(4, "0")}`
        : null,
      lat: itemLat,
      lng: itemLng,
      distanceMeters: Math.round(haversineMeters(lat, lng, itemLat, itemLng)),
      placeUrl: `https://map.kakao.com/link/search/${encodeURIComponent(name)}`,
    });
  }

  items.sort((a, b) => a.distanceMeters - b.distanceMeters); // sort=distance 재현 (§4.6)
  return { items, truncated: count >= 45 };
}

// 호출부(app/api/nearby/route.ts)가 쓰는 유일한 진입점.
// KAKAO_REST_API_KEY가 있으면 실호출, 없으면 목데이터로 폴백한다.
export async function fetchNearby(query: NearbyQuery, signal: AbortSignal): Promise<NearbyResult> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return generateMockNearby(query);
  return fetchFromKakao(query, apiKey, signal);
}
