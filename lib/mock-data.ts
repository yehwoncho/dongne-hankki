// ⚠️ 목(mock) 데이터 생성기.
// PRD §4.4에서 확정한 실제 아키텍처는 "배치 ETL → 자체 DB"이지만, 문화공공데이터광장 인증키 발급과
// 실호출 검증(PRD §14-A, 구현순서 1~2번)이 아직 없는 상태라 화면 구현을 먼저 진행하기 위해
// 결정론적(seed 고정) 가짜 데이터를 생성한다. lib/db.ts의 함수 시그니처는 §8 API 계약과 동일하게
// 맞춰뒀으므로, 실제 ETL이 Postgres에 적재되면 이 파일만 걷어내고 db.ts 내부를 실 쿼리로 교체하면 된다.

import type { Category, Restaurant, Sido } from "./types";
import { CATEGORY_ORDER } from "./category";
import { SIDO_LIST } from "./region";

export const SNAPSHOT_DATE = "2026-07-01";

export interface DistrictSeed {
  name: string; // '강남구' | '수원시 영통구' | '세종시'
  slug: string; // 'gangnam-gu'
}

// 시·도별 대표 시·군·구 목록. 서울은 25개 자치구 전체, 그 외 16개 시·도는 대표 시·군·구 3~8개.
// (실제 서비스라면 §5.2 parseRegion으로 원본 주소에서 전수 추출하지만, 목데이터 단계에선 대표 지역만 둔다.)
const DISTRICTS: Record<Sido, DistrictSeed[]> = {
  서울: [
    { name: "강남구", slug: "gangnam-gu" }, { name: "강동구", slug: "gangdong-gu" },
    { name: "강북구", slug: "gangbuk-gu" }, { name: "강서구", slug: "gangseo-gu" },
    { name: "관악구", slug: "gwanak-gu" }, { name: "광진구", slug: "gwangjin-gu" },
    { name: "구로구", slug: "guro-gu" }, { name: "금천구", slug: "geumcheon-gu" },
    { name: "노원구", slug: "nowon-gu" }, { name: "도봉구", slug: "dobong-gu" },
    { name: "동대문구", slug: "dongdaemun-gu" }, { name: "동작구", slug: "dongjak-gu" },
    { name: "마포구", slug: "mapo-gu" }, { name: "서대문구", slug: "seodaemun-gu" },
    { name: "서초구", slug: "seocho-gu" }, { name: "성동구", slug: "seongdong-gu" },
    { name: "성북구", slug: "seongbuk-gu" }, { name: "송파구", slug: "songpa-gu" },
    { name: "양천구", slug: "yangcheon-gu" }, { name: "영등포구", slug: "yeongdeungpo-gu" },
    { name: "용산구", slug: "yongsan-gu" }, { name: "은평구", slug: "eunpyeong-gu" },
    { name: "종로구", slug: "jongno-gu" }, { name: "중구", slug: "jung-gu" },
    { name: "중랑구", slug: "jungnang-gu" },
  ],
  부산: [
    { name: "해운대구", slug: "haeundae-gu" }, { name: "수영구", slug: "suyeong-gu" },
    { name: "부산진구", slug: "busanjin-gu" }, { name: "사하구", slug: "saha-gu" },
    { name: "동래구", slug: "dongnae-gu" }, { name: "남구", slug: "nam-gu" },
  ],
  대구: [
    { name: "수성구", slug: "suseong-gu" }, { name: "중구", slug: "jung-gu" },
    { name: "달서구", slug: "dalseo-gu" }, { name: "동구", slug: "dong-gu" },
  ],
  인천: [
    { name: "연수구", slug: "yeonsu-gu" }, { name: "남동구", slug: "namdong-gu" },
    { name: "부평구", slug: "bupyeong-gu" }, { name: "서구", slug: "seo-gu" },
  ],
  광주: [
    { name: "서구", slug: "seo-gu" }, { name: "북구", slug: "buk-gu" },
    { name: "광산구", slug: "gwangsan-gu" },
  ],
  대전: [
    { name: "유성구", slug: "yuseong-gu" }, { name: "서구", slug: "seo-gu" },
    { name: "중구", slug: "jung-gu" },
  ],
  울산: [
    { name: "남구", slug: "nam-gu" }, { name: "북구", slug: "buk-gu" },
    { name: "울주군", slug: "ulju-gun" },
  ],
  세종: [{ name: "세종시", slug: "sejong-si" }],
  경기: [
    { name: "수원시 영통구", slug: "suwon-si-yeongtong-gu" },
    { name: "성남시 분당구", slug: "seongnam-si-bundang-gu" },
    { name: "고양시 일산동구", slug: "goyang-si-ilsandong-gu" },
    { name: "용인시 수지구", slug: "yongin-si-suji-gu" },
    { name: "화성시", slug: "hwaseong-si" },
    { name: "부천시", slug: "bucheon-si" },
    { name: "안양시 동안구", slug: "anyang-si-dongan-gu" },
    { name: "평택시", slug: "pyeongtaek-si" },
  ],
  강원: [
    { name: "춘천시", slug: "chuncheon-si" }, { name: "원주시", slug: "wonju-si" },
    { name: "강릉시", slug: "gangneung-si" }, { name: "속초시", slug: "sokcho-si" },
  ],
  충북: [
    { name: "청주시 상당구", slug: "cheongju-si-sangdang-gu" },
    { name: "충주시", slug: "chungju-si" }, { name: "제천시", slug: "jecheon-si" },
  ],
  충남: [
    { name: "천안시 동남구", slug: "cheonan-si-dongnam-gu" },
    { name: "아산시", slug: "asan-si" }, { name: "서산시", slug: "seosan-si" },
    { name: "공주시", slug: "gongju-si" },
  ],
  전북: [
    { name: "전주시 완산구", slug: "jeonju-si-wansan-gu" },
    { name: "익산시", slug: "iksan-si" }, { name: "군산시", slug: "gunsan-si" },
    { name: "남원시", slug: "namwon-si" },
  ],
  전남: [
    { name: "여수시", slug: "yeosu-si" }, { name: "순천시", slug: "suncheon-si" },
    { name: "목포시", slug: "mokpo-si" }, { name: "나주시", slug: "naju-si" },
  ],
  경북: [
    { name: "포항시 남구", slug: "pohang-si-nam-gu" }, { name: "경주시", slug: "gyeongju-si" },
    { name: "구미시", slug: "gumi-si" }, { name: "안동시", slug: "andong-si" },
  ],
  경남: [
    { name: "창원시 의창구", slug: "changwon-si-uichang-gu" }, { name: "김해시", slug: "gimhae-si" },
    { name: "진주시", slug: "jinju-si" }, { name: "양산시", slug: "yangsan-si" },
  ],
  제주: [
    { name: "제주시", slug: "jeju-si" }, { name: "서귀포시", slug: "seogwipo-si" },
  ],
};

// 시·도 대략적 중심 좌표 (위성지도에서 실제 그 지역 근처가 보이도록 하기 위한 지터 기준점).
// 실 ETL이 붙기 전까지는 식당별 정확한 좌표가 없으므로, 최소한 "그 도시 어딘가"로는 보이게 한다.
const SIDO_CENTER: Record<Sido, [number, number]> = {
  서울: [37.5665, 126.978], 부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014],
  인천: [37.4563, 126.7052], 광주: [35.1595, 126.8526], 대전: [36.3504, 127.3845],
  울산: [35.5384, 129.3114], 세종: [36.4801, 127.2891], 경기: [37.4138, 127.5183],
  강원: [37.8228, 128.1555], 충북: [36.6357, 127.4917], 충남: [36.5184, 126.8],
  전북: [35.7175, 127.153], 전남: [34.8161, 126.463], 경북: [36.4919, 128.8889],
  경남: [35.4606, 128.2132], 제주: [33.4996, 126.5312],
};

// 카테고리별 상대 비중 — Stitch 목록 화면 샘플(강남구 일식 검색 시 표기된 칩 건수) 비율을 참고.
const CATEGORY_WEIGHT: Record<Category, number> = {
  korean: 0.30, cafe: 0.19, snack: 0.10, japanese: 0.13,
  bar: 0.09, chinese: 0.08, western: 0.06, asian: 0.03, etc: 0.02,
};

const NAME_PREFIX = [
  "행복", "다정", "고향", "전통", "황금", "진심", "옛날", "정든", "화목", "다솜",
  "보람", "은은한", "정성", "별빛", "다온", "소담", "해맑은", "넉넉", "단골", "제일",
  "봉은사", "동네", "우리", "성수", "연희", "이화", "삼삼", "한아름", "청록", "새록",
];
const NAME_SUFFIX: Record<Category, string[]> = {
  korean: ["식당", "밥상", "백반", "국밥", "해장국", "보쌈", "곰탕"],
  chinese: ["반점", "중화요리", "마라탕", "짬뽕"],
  japanese: ["스시", "초밥", "라멘", "이자카야", "우동"],
  western: ["파스타", "스테이크하우스", "피자", "비스트로"],
  asian: ["쌀국수", "커리하우스", "분짜", "아시안다이닝"],
  snack: ["분식", "떡볶이", "김밥천국"],
  cafe: ["카페", "베이커리", "디저트", "커피"],
  bar: ["포차", "호프", "펍", "와인바"],
  etc: ["푸드", "다이닝", "맛집", "키친"],
};
const STREETS = [
  "중앙로", "테헤란로", "시청로", "대학로", "역전로", "한빛로", "번영로",
  "문화로", "공원로", "시장길", "경제로", "평화로", "해안로", "본동길",
];

// mulberry32 — 결정론적 의사난수 생성기. 요청마다 데이터가 바뀌면 페이지네이션이 흔들리므로
// 반드시 seed 고정 PRNG를 쓴다 (실 DB라면 그냥 저장된 값을 읽으면 되는 문제).
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
function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function buildDistrict(sido: Sido, district: DistrictSeed, sizeTier: number): Restaurant[] {
  const rand = mulberry32(hashSeed(`${sido}-${district.slug}`));
  const total = Math.round(8 + sizeTier * 12 + rand() * 18); // 지역마다 다른 규모
  const restaurants: Restaurant[] = [];

  for (const cat of CATEGORY_ORDER) {
    // 하한을 낮게 잡아 비중 낮은 카테고리(아시안·기타, 기타 등)는 자연스럽게 0건이 나오도록 한다.
    // (PRD F2 수용기준: 0건 카테고리도 비활성 칩으로 실제 노출돼야 함)
    const count = Math.round(total * CATEGORY_WEIGHT[cat] * (0.1 + rand() * 0.9));
    for (let i = 0; i < count; i++) {
      const prefix = pick(rand, NAME_PREFIX);
      const suffix = pick(rand, NAME_SUFFIX[cat]);
      const name = rand() > 0.5 ? `${prefix}${suffix}` : `${prefix} ${suffix}`;
      const street = pick(rand, STREETS);
      const num = Math.floor(rand() * 900) + 1;
      const hasPhone = rand() > 0.28;
      const hasCoord = rand() > 0.35;
      const hasIntro = rand() > 0.55;

      restaurants.push({
        id: `${district.slug}-${cat}-${i}`,
        name,
        sido,
        sigungu: district.name,
        category: cat,
        rawBizType: null,
        roadAddress: `${sido} ${district.name} ${street} ${num}`,
        jibunAddress: `${sido} ${district.name} ${Math.floor(rand() * 900) + 1}-${Math.floor(rand() * 40) + 1}`,
        phone: hasPhone
          ? `0${rand() > 0.5 ? "2" : "31"}-${Math.floor(rand() * 900) + 100}-${String(Math.floor(rand() * 10000)).padStart(4, "0")}`
          : null,
        // 시·도 중심 좌표에서 소폭(약 ±3km) 지터 — 실제 그 도시 근방으로 보이게.
        lat: hasCoord ? SIDO_CENTER[sido][0] + (rand() - 0.5) * 0.06 : null,
        lng: hasCoord ? SIDO_CENTER[sido][1] + (rand() - 0.5) * 0.06 : null,
        intro: hasIntro
          ? "신선한 재료와 정성을 다한 손맛으로 오랫동안 동네 사람들에게 사랑받아 온 곳입니다."
          : null,
        snapshotDate: SNAPSHOT_DATE,
      });
    }
  }
  return restaurants;
}

let _cache: Restaurant[] | null = null;

// 전체 목데이터를 한 번만 생성해 모듈 싱글턴으로 캐시한다 (요청마다 재생성하면 느리고, 페이지네이션도 흔들림).
export function getAllRestaurants(): Restaurant[] {
  if (_cache) return _cache;
  const all: Restaurant[] = [];
  SIDO_LIST.forEach(({ sido }, sidoIdx) => {
    const districts = DISTRICTS[sido] ?? [];
    districts.forEach((d, i) => {
      // 서울은 지역마다 규모를 좀 더 다양하게, 그 외 시·도는 중간 규모로.
      const sizeTier = sido === "서울" ? 3 + ((sidoIdx + i) % 5) : 1 + (i % 3);
      all.push(...buildDistrict(sido, d, sizeTier));
    });
  });
  _cache = all;
  return all;
}

export function getDistricts(sido: Sido): DistrictSeed[] {
  return DISTRICTS[sido] ?? [];
}
