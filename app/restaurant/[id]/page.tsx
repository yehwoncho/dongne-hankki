import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { districtSlugToName } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";
import { findDistrictRestaurantById } from "@/lib/kakao-district";
import { CATEGORY_LABELS } from "@/lib/category";
import DetailActions from "@/components/DetailActions";
import RestaurantMap from "@/components/RestaurantMap";
import ReviewPanel from "@/components/ReviewPanel";
import AuthWidget from "@/components/AuthWidget";

// F4 식당 상세 — Stitch "식당 상세 - 스시오마카세 - 동네한끼" 화면을 그대로 포팅.
//
// ⚠️ 카카오 전환(WIRE_DETAIL_PAGE.md): 카카오 로컬 API엔 "id로 상세 조회"가 없어서,
// URL에 ?sido=&sigungu= 슬러그를 같이 실어 보내 목록 조회 때 캐시된 45건 안에서 id로
// 찾는다(findDistrictRestaurantById). 목록에서 클릭해 들어온 경우 십중팔구 캐시 히트라
// 카카오 호출이 없다. sido/sigungu가 없으면(옛날 링크·직접 URL 입력) 원리상 이 id를
// 찾을 수 없으므로 조회 자체를 시도하지 않고 안내 화면을 보여준다(500/404 아님).
//
// "색인/장부(ledger)" 리디자인 — app/page.tsx(랜딩) 등 다른 화면과 톤을 맞춘다.
// 팔레트 값은 동일, 이 페이지도 별도 라우트 트리라 재선언 필요(app/[sido]/page.tsx와 동일 이유).
// "위치 정보 없어 못 찾음" 폴백 분기의 본문(아이콘·문구·CTA)은 예외 상태라 범위 밖 — 헤더/푸터
// 셸만 통일한다.
const PALETTE_VARS = {
  "--paper": "#FAFAF7",
  "--ink": "#1C1B1A",
  "--index-red": "#C81E3A",
  "--ledger": "#DDD9D2",
  "--muted-ink": "#6B6862",
} as React.CSSProperties;

const SERIF = '"Noto Serif KR", serif';

type DetailSearchParams = { sido?: string; sigungu?: string };

/** searchParams의 sido/sigungu 슬러그를 카카오 조회에 필요한 한글명으로 변환. 실패하면 null. */
function resolveRegion(sp: DetailSearchParams): { sidoName: string; sigunguName: string } | null {
  if (!sp.sido || !sp.sigungu) return null;
  const sido = sidoBySlug(sp.sido);
  if (!sido) return null;
  const sigunguName = districtSlugToName(sido, sp.sigungu);
  if (!sigunguName) return null;
  return { sidoName: sido, sigunguName };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<DetailSearchParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const region = resolveRegion(await searchParams);
  if (!region) return { title: "식당을 찾을 수 없습니다 — 동네한끼" };

  const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
  const restaurant = await findDistrictRestaurantById(region.sidoName, region.sigunguName, id, apiKey);
  if (!restaurant) return { title: "식당을 찾을 수 없습니다 — 동네한끼" };

  return {
    title: `${restaurant.name} — 동네한끼`,
    description: restaurant.roadAddress ?? undefined,
    openGraph: {
      title: restaurant.name,
      description: restaurant.roadAddress ?? undefined,
    },
  };
}

export default async function RestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const region = resolveRegion(sp);

  if (!region) {
    // sido/sigungu 쿼리 없이 들어온 경우 — 원리상 이 id를 찾을 수 없다. 안내만 보여준다.
    return (
      <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
        <header className="w-full top-0 sticky z-50 bg-[var(--paper)] border-b border-[var(--ledger)]">
          <div className="flex items-center justify-between gap-2 px-4 h-14 w-full max-w-2xl mx-auto">
            <Link
              href="/"
              aria-label="홈으로"
              className="flex items-center justify-center p-2 rounded-full hover:bg-[var(--ledger)]/30 transition-colors active:scale-95 duration-150 text-[var(--muted-ink)] hover:text-[var(--ink)] flex-shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-label font-bold text-[var(--ink)] flex-1 min-w-0 text-center truncate">식당 상세</h1>
            <AuthWidget variant="inline" palette="index" />
          </div>
        </header>
        <main className="flex-grow w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 text-center">
          <span
            className="material-symbols-outlined text-6xl text-outline-variant mb-6"
            style={{ fontVariationSettings: "'wght' 200" }}
          >
            location_off
          </span>
          <h2 className="text-xl font-bold font-headline text-on-surface mb-2">
            위치 정보가 없어 이 가게를 찾을 수 없어요
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-[250px] leading-relaxed">목록에서 다시 찾아주세요</p>
          <Link
            href="/"
            className="w-full max-w-[280px] h-12 rounded-lg border border-primary text-primary font-label font-semibold flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
          >
            지역 선택으로 가기
          </Link>
        </main>
      </div>
    );
  }

  const apiKey = process.env.KAKAO_REST_API_KEY ?? "";
  const restaurant = await findDistrictRestaurantById(region.sidoName, region.sigunguName, id, apiKey);
  if (!restaurant) notFound(); // 캐시된 45건 안에 없음 — 기존 404 처리 방식 그대로

  const sidoSlug = sp.sido!;
  const sigunguSlug = sp.sigungu!;
  const backHref = `/${sidoSlug}/${sigunguSlug}`;
  const hasCoords = Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng);

  return (
    <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-50 bg-[var(--paper)] border-b border-[var(--ledger)]">
        <div className="flex items-center justify-between gap-2 px-4 h-14 w-full max-w-2xl mx-auto">
          <Link
            href={backHref}
            aria-label="뒤로가기"
            className="flex items-center justify-center p-2 rounded-full hover:bg-[var(--ledger)]/30 transition-colors active:scale-95 duration-150 text-[var(--muted-ink)] hover:text-[var(--ink)] flex-shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-label font-bold text-[var(--ink)] flex-1 min-w-0 text-center truncate">식당 상세</h1>
          <AuthWidget variant="inline" palette="index" />
        </div>
      </header>

      <main className="flex-grow w-full max-w-2xl mx-auto">
        {/* Hero Map — 좌표가 있을 때만 렌더링 (PRD F4 수용기준). 카카오맵 SDK 키(§14-G)가
            아직 없어 키 없이 쓸 수 있는 Leaflet + Esri 위성 타일로 위치를 보여준다. */}
        {hasCoords ? (
          <div className="w-full h-48 md:h-64 relative bg-[var(--ledger)]/15 overflow-hidden">
            <RestaurantMap lat={restaurant.lat} lng={restaurant.lng} name={restaurant.name} />
          </div>
        ) : null}

        <div className="px-4 py-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2
                className="text-2xl font-bold text-[var(--ink)] mb-2 break-keep"
                style={{ fontFamily: SERIF }}
              >
                {restaurant.name}
              </h2>
              <span className="inline-flex items-center text-xs font-label font-bold text-[var(--index-red)] border border-[var(--index-red)]/40 px-1.5 py-0.5">
                {CATEGORY_LABELS[restaurant.category]}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--muted-ink)] mt-0.5">location_on</span>
              {restaurant.roadAddress ? (
                <div>
                  <p className="text-sm text-[var(--ink)]">{restaurant.roadAddress}</p>
                  {restaurant.jibunAddress && (
                    <p className="text-xs text-[var(--muted-ink)] mt-0.5">{restaurant.jibunAddress}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-ink)]/50">위치 정보가 없습니다</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--muted-ink)]">call</span>
              <p className={`text-sm ${restaurant.phone ? "text-[var(--ink)]" : "text-[var(--muted-ink)]/50"}`}>
                {restaurant.phone ?? "전화번호 없음"}
              </p>
            </div>
          </div>

          <DetailActions phone={restaurant.phone} address={restaurant.roadAddress ?? restaurant.jibunAddress ?? restaurant.name} />

          <section className="mb-8 border-t border-[var(--ledger)] pt-6">
            <h3 className="font-bold text-lg text-[var(--ink)] mb-3">소개</h3>
            <p className="text-sm text-[var(--muted-ink)] leading-relaxed">
              등록된 소개 정보가 없습니다.{" "}
              <a href={restaurant.placeUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--index-red)] underline">
                카카오맵에서 더 보기
              </a>
            </p>
          </section>

          {/* 구글 리뷰 패널 — 카카오 로컬 API엔 별점/리뷰가 없어서 별도로 받아온다(F4 확장). */}
          <ReviewPanel
            id={restaurant.id}
            name={restaurant.name}
            address={restaurant.roadAddress ?? restaurant.jibunAddress ?? restaurant.name}
          />

          <div className="border border-[var(--ledger)] p-4 mb-4">
            <div className="flex items-start gap-2 text-[var(--muted-ink)]">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
              <p className="text-xs leading-relaxed">
                이 정보는 카카오맵 제공 정보이며 실제와 다를 수 있습니다. 방문 전 확인을 권합니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-4 bg-[var(--paper)] border-t border-[var(--ledger)] mt-auto">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-2 font-label text-xs text-center text-[var(--muted-ink)]">
          <p>© 동네한끼. 데이터 출처: 카카오맵 (실시간 조회)</p>
        </div>
      </footer>
    </div>
  );
}
