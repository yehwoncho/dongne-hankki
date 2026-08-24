// "나를 위한 추천" — 사용자가 가장 많이 담은 카테고리로 카카오 키워드 검색을 재호출한다.
// lib/kakao.ts(F7 "내 주변")와 원리(REST 키는 서버 전용, 키 없으면 목데이터 폴백)는 같지만,
// 검색/담기 등 기존 기능 파일(lib/kakao.ts, app/api/nearby)은 한 줄도 건드리지 않기 위해
// 이 파일로 완전히 분리했다 — mulberry32 목데이터 생성기 등 약간의 중복은 감수한다.

import { toCategory } from "./category";
import type { Category, KakaoNearbyItem } from "./types";

const KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const CATEGORY_GROUP_CODE = "FD6"; // 음식점만 — 카페 등 다른 그룹은 이번 범위 밖
const SIZE = 15;

export interface RecommendQuery {
  categoryLabel: string; // CATEGORY_LABELS 값(예: "한식") — 카카오 재검색 쿼리로 그대로 사용
  lat: number;
  lng: number;
  radius: number;
}

interface KakaoDocument {
  id: string;
  place_name: string;
  category_name: string;
  road_address_name: string;
  phone: string;
  x: string; // 경도(lng)
  y: string; // 위도(lat)
  place_url: string;
}

function toRecommendItem(doc: KakaoDocument): KakaoNearbyItem {
  const leaf = doc.category_name.split(">").pop()?.trim() ?? "";
  return {
    kakaoId: doc.id,
    name: doc.place_name,
    category: toCategory(leaf),
    rawCategoryName: doc.category_name,
    roadAddress: doc.road_address_name || null,
    phone: doc.phone || null,
    lat: Number(doc.y),
    lng: Number(doc.x),
    distanceMeters: 0, // 키워드 검색엔 카카오가 distance를 안 준다 — 추천 목록엔 거리 미사용
    placeUrl: doc.place_url,
  };
}

async function fetchFromKakao(
  { categoryLabel, lat, lng, radius }: RecommendQuery,
  apiKey: string,
  signal: AbortSignal
): Promise<KakaoNearbyItem[]> {
  const url = `${KAKAO_KEYWORD_URL}?query=${encodeURIComponent(categoryLabel)}&category_group_code=${CATEGORY_GROUP_CODE}&x=${lng}&y=${lat}&radius=${radius}&sort=accuracy&size=${SIZE}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal,
  });
  if (!res.ok) throw new Error(`kakao ${res.status}`);

  const data = (await res.json()) as { documents: KakaoDocument[] };
  return data.documents.map(toRecommendItem);
}

// ⚠️ 목(mock) 폴백 — lib/kakao.ts와 같은 mulberry32 PRNG 방식을 이 파일 안에서 독립적으로
// 재구현했다(공유하면 lib/kakao.ts를 import/수정하게 되어 "검색 기능 건드리지 않기" 원칙과 충돌).
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

const MOCK_PREFIX = ["행복", "다정", "고향", "전통", "황금", "진심", "옛날", "정든", "화목", "다솜"];
const MOCK_SUFFIX_BY_LABEL: Record<string, string[]> = {
  한식: ["식당", "밥상", "백반", "국밥"],
  중식: ["반점", "중화요리"],
  일식: ["스시", "초밥", "라멘", "이자카야"],
  양식: ["파스타", "스테이크하우스", "피자"],
  "아시안·기타": ["쌀국수", "커리하우스"],
  분식: ["분식", "떡볶이"],
  "카페·디저트": ["카페", "베이커리", "커피"],
  술집: ["포차", "호프", "펍"],
  기타: ["푸드", "다이닝"],
};
const MOCK_STREETS = ["중앙로", "역전로", "번영로", "문화로", "공원로"];

function generateMockRecommendation({ categoryLabel, lat, lng, radius }: RecommendQuery): KakaoNearbyItem[] {
  // 카테고리+좌표로 seed 고정 — 같은 조건 재조회 시 결과가 흔들리지 않는다 (lib/kakao.ts와 동일 원칙).
  const rand = mulberry32(hashSeed(`${categoryLabel}:${lat.toFixed(3)},${lng.toFixed(3)},${radius}`));
  const suffixes = MOCK_SUFFIX_BY_LABEL[categoryLabel] ?? MOCK_SUFFIX_BY_LABEL["기타"];
  const category: Category = toCategory(categoryLabel);
  const count = Math.min(SIZE, Math.round(5 + rand() * 8));

  const items: KakaoNearbyItem[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${MOCK_PREFIX[Math.floor(rand() * MOCK_PREFIX.length)]} ${suffixes[Math.floor(rand() * suffixes.length)]}`;
    const angle = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * radius; // sqrt로 중심 쏠림 방지
    const dLat = (dist * Math.cos(angle)) / 111320;
    const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
    const itemLat = lat + dLat;
    const itemLng = lng + dLng;

    items.push({
      kakaoId: `mock-recommend-${i}-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}`,
      name,
      category,
      rawCategoryName: `음식점 > ${categoryLabel} > ${name}`,
      roadAddress: `${MOCK_STREETS[Math.floor(rand() * MOCK_STREETS.length)]} ${Math.floor(rand() * 90) + 1}`,
      phone: null,
      lat: itemLat,
      lng: itemLng,
      distanceMeters: Math.round(dist),
      placeUrl: `https://map.kakao.com/link/search/${encodeURIComponent(name)}`,
    });
  }
  return items;
}

// 호출부(app/api/recommend/route.ts)가 쓰는 유일한 진입점.
export async function fetchRecommendation(query: RecommendQuery, signal: AbortSignal): Promise<KakaoNearbyItem[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return generateMockRecommendation(query);
  return fetchFromKakao(query, apiKey, signal);
}
