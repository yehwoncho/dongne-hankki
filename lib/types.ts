// PRD_지역맛집_서비스.md §7 타입 정의를 그대로 옮김.

export type Sido =
  | "서울" | "부산" | "대구" | "인천" | "광주" | "대전" | "울산" | "세종"
  | "경기" | "강원" | "충북" | "충남" | "전북" | "전남" | "경북" | "경남" | "제주";

export type Category =
  | "korean" | "chinese" | "japanese" | "western"
  | "asian" | "snack" | "cafe" | "bar" | "etc";

export interface Restaurant {
  id: string;
  name: string;
  sido: Sido;
  sigungu: string; // '강남구' | '수원시 영통구' | '세종시'
  category: Category;
  rawBizType: string | null; // 원본 업태명 — 매핑 개선용으로 보존
  roadAddress: string | null;
  jibunAddress: string | null;
  phone: string | null; // 정규화된 숫자열
  lat: number | null;
  lng: number | null;
  intro: string | null; // 템플릿 문구는 null로 저장
  snapshotDate: string; // ISO date — 이 레코드의 기준일
}

export interface RegionOption {
  slug: string; // 'gangnam-gu'
  name: string; // '강남구'
  count: number; // 식당 수 (0인 지역은 응답에서 제외)
}

export interface CategoryCount {
  category: Category;
  label: string; // '일식'
  count: number; // 0이면 UI에서 비활성
}

export interface RestaurantListResponse {
  items: Restaurant[];
  total: number;
  page: number;
  pageSize: number;
  categories: CategoryCount[]; // 현재 지역 기준 카테고리별 건수
  snapshotDate: string;
}

// ── F7 전용 (PRD v0.2 §7) — 공공데이터 Restaurant와 분리된 별도 모델 ──
// DB에 영속 저장하지 않는다 (§4.6 라이선스 제약)
export interface KakaoNearbyItem {
  kakaoId: string; // 카카오 장소 ID (자체 저장 안 함 — 응답 그대로 전달)
  name: string;
  category: Category; // §5.3 매핑 함수로 변환된 표준 카테고리
  rawCategoryName: string; // 카카오 원본 category_name (디버깅용)
  roadAddress: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distanceMeters: number; // 카카오 응답의 distance 필드
  placeUrl: string; // 카카오맵 상세 페이지 — 항상 노출 필수
}

export interface NearbyResponse {
  items: KakaoNearbyItem[];
  center: { lat: number; lng: number };
  radius: number;
  truncated: boolean; // 45건 상한에 걸렸는지 — true면 UI에 안내 문구
  source: "kakao";
}
