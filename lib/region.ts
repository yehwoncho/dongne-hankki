import type { Sido } from "./types";

// PRD §5.2 주소 → 시·도 정규화 테이블. 실제 ETL(공공 API 원본 주소 파싱)이 붙을 때 그대로 재사용한다.
export const SIDO_ALIAS: Record<string, Sido> = {
  서울특별시: "서울", 서울시: "서울", 서울: "서울",
  부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 대전광역시: "대전", 울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기", 강원특별자치도: "강원", 강원도: "강원",
  충청북도: "충북", 충청남도: "충남",
  전북특별자치도: "전북", 전라북도: "전북", 전라남도: "전남",
  경상북도: "경북", 경상남도: "경남",
  제주특별자치도: "제주", 제주도: "제주",
};

// 일반시 산하 구를 가진 시 — 2어절로 묶어야 하는 대상 (PRD §5.2)
export const CITIES_WITH_GU = new Set([
  "수원시", "성남시", "안양시", "안산시", "고양시", "용인시",
  "청주시", "천안시", "전주시", "포항시", "창원시",
]);

export function parseRegion(
  road?: string | null,
  jibun?: string | null
): { sido: Sido; sigungu: string } | null {
  const addr = road?.trim() || jibun?.trim() || "";
  if (!addr) return null;

  const parts = addr.split(/\s+/);
  const sido = SIDO_ALIAS[parts[0]];
  if (!sido) return null; // 미매핑 → 게이트 지표에 집계

  if (sido === "세종") return { sido, sigungu: "세종시" };

  const first = parts[1];
  if (!first) return null;

  if (CITIES_WITH_GU.has(first) && parts[2]?.endsWith("구")) {
    return { sido, sigungu: `${first} ${parts[2]}` };
  }
  if (/(시|군|구)$/.test(first)) return { sido, sigungu: first };

  return null;
}

// 슬러그 규칙 (PRD §9): 한글 URL은 공유 시 깨져 보이므로 영문 슬러그로 고정.
export const SIDO_LIST: { sido: Sido; slug: string }[] = [
  { sido: "서울", slug: "seoul" },
  { sido: "부산", slug: "busan" },
  { sido: "대구", slug: "daegu" },
  { sido: "인천", slug: "incheon" },
  { sido: "광주", slug: "gwangju" },
  { sido: "대전", slug: "daejeon" },
  { sido: "울산", slug: "ulsan" },
  { sido: "세종", slug: "sejong" },
  { sido: "경기", slug: "gyeonggi" },
  { sido: "강원", slug: "gangwon" },
  { sido: "충북", slug: "chungbuk" },
  { sido: "충남", slug: "chungnam" },
  { sido: "전북", slug: "jeonbuk" },
  { sido: "전남", slug: "jeonnam" },
  { sido: "경북", slug: "gyeongbuk" },
  { sido: "경남", slug: "gyeongnam" },
  { sido: "제주", slug: "jeju" },
];

const SIDO_BY_SLUG_MAP = new Map(SIDO_LIST.map((s) => [s.slug, s.sido]));
const SLUG_BY_SIDO_MAP = new Map(SIDO_LIST.map((s) => [s.sido, s.slug]));

export function sidoBySlug(slug: string): Sido | null {
  return SIDO_BY_SLUG_MAP.get(slug) ?? null;
}

export function slugBySido(sido: Sido): string {
  return SLUG_BY_SIDO_MAP.get(sido)!;
}
