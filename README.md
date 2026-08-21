# 동네한끼

`PRD_지역맛집_서비스.md` 기반 구현. Stitch에서 만든 5개 화면(F1① 시·도 선택, F1② 시·군·구 선택,
F2+F3 목록, F4 상세, F6 빈 상태)을 디자인 변경 없이 그대로 Next.js App Router로 포팅했다.
PRD v0.2에서 신설된 **F7 "내 주변 맛집"**(카카오 로컬 API 기반 실시간 조회, `/nearby`)도 §4.6·§6-F7
스펙대로 추가했다 — 기존 화면들과 코드 상 완전히 분리된 별도 데이터 경로다.

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 지금 상태 — 무엇이 진짜고 무엇이 목(mock)인가

| 영역 | 상태 |
|---|---|
| 화면(UI) | Stitch 화면을 그대로 포팅. 컬러/폰트/레이아웃은 디자인 시스템과 동일 |
| 라우팅·URL 구조 | PRD §9 그대로 (`/[sido]/[sigungu]?cat=`) |
| API 라우트 (`/api/*`) | PRD §8 계약과 동일한 응답 스키마 |
| **데이터 (F1~F3)** | ⚠️ **전부 목데이터** (`lib/mock-data.ts`, seed 고정 결정론적 생성). 문화공공데이터광장 실호출·ETL·Postgres는 아직 없음 |
| **데이터 (F7 내 주변 맛집)** | `KAKAO_REST_API_KEY`가 있으면 카카오 로컬 API 실호출(`/api/nearby` 서버 프록시), 없으면 좌표 기반 결정론적 목데이터로 자동 폴백 (`lib/kakao.ts`) — F1~F3과 달리 **DB에 저장하지 않는다**(§4.6 라이선스 제약) |
| 지도 (상세 화면, F4) | `.env.local`에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 있으면 네이버 지도 위성뷰, 없으면 키 없이 되는 Esri 위성 타일로 자동 폴백 (`components/RestaurantMap.tsx`) |
| 지도 (주변찾기, F7) | `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`가 있으면 카카오맵 JS SDK, 없으면 Esri 위성 타일로 자동 폴백 (`components/NearbyMap.tsx`) |

## 실제 서비스로 가기 위한 다음 단계 (PRD §10 그대로)

**F1~F3 (지역목록)**

1. 문화공공데이터광장 활용신청 → 인증키 발급
2. 실호출로 §4.2~§4.3 API 규격 확정 (`curl`로 실제 필드명·필터 파라미터 존재 여부 검증)
3. `lib/mock-data.ts`를 걷어내고 `etl/` 파이프라인(§4.5) + Postgres(§9 Drizzle) 붙이기 —
   `lib/db.ts`의 함수 시그니처는 이미 실 DB 쿼리로 교체할 수 있게 맞춰뒀다
4. ~~지도 SDK 연동~~ — 완료. `.env.local`에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 채우면 바로 전환됨 (아래 참고)
5. GitHub Actions 주 1회 ETL cron 등록

**F7 (내 주변 맛집, v0.2 신설)**

10. 카카오 개발자 앱 등록 → REST API 키 + JavaScript 키 발급 → 플랫폼 도메인 등록 (아래 참고)
11. `curl`로 카테고리 검색 실호출 → 실제 응답 필드·`category_name` 계층 구조 확인, `lib/kakao.ts`의
    가정(§4.6 매핑 규칙)을 실측치로 교체
12. 짧은 캐시를 `app/api/nearby/route.ts`의 인메모리 Map에서 Vercel KV / Upstash Redis로 교체
    (현재 구현은 서버 재시작 시 캐시가 날아가는 프로세스 메모리 캐시 — 단일 인스턴스 개발용)

## 지도 SDK 키 설정

1. `.env.local.example`을 `.env.local`로 복사
2. **네이버 지도 (F4 상세)**: [NCP 콘솔](https://console.ncloud.com) > AI·NAVER API > Application에서 발급받은 Client ID를 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 채우기. 해당 Application의 **Web 서비스 URL**에 `http://localhost:3000`(개발) 및 실제 배포 도메인이 등록돼 있어야 함
3. **카카오 (F7 내 주변 맛집)**: [카카오 개발자 콘솔](https://developers.kakao.com)에서 앱 생성 후
   - **REST API 키** → `KAKAO_REST_API_KEY` (서버 전용, `NEXT_PUBLIC_` 접두사 금지)
   - **JavaScript 키** → `NEXT_PUBLIC_KAKAO_MAP_JS_KEY` (지도 SDK용, 선택 — 없으면 Esri 폴백)
   - 앱의 **플랫폼 > Web** 사이트 도메인에 `http://localhost:3000` 및 실제 배포 도메인 등록 필요
4. 서버 재시작 (`npm run dev`)

## 디렉토리

```
app/            페이지 + API 라우트 (PRD §9 구조 그대로)
                nearby/page.tsx, api/nearby/route.ts = F7
components/     CategoryChips, Pagination, RestaurantCard, EmptyState, DistrictList, DetailActions
                NearbyView, NearbyMap, NearbyList, SourceBadge = F7
lib/            types, region(§5.2), category(§5.3), db(§8 쿼리 계약), mock-data(목 생성기), url
                kakao(§4.6, F7 실호출·목폴백), geohash(F7 캐시 버킷) = F7
```
