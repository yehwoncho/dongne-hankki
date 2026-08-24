import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { districtSlugToName } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";
import { findDistrictRestaurantById } from "@/lib/kakao-district";
import { CATEGORY_LABELS } from "@/lib/category";
import DetailActions from "@/components/DetailActions";
import RestaurantMap from "@/components/RestaurantMap";

// F4 식당 상세 — Stitch "식당 상세 - 스시오마카세 - 동네한끼" 화면을 그대로 포팅.
//
// ⚠️ 카카오 전환(WIRE_DETAIL_PAGE.md): 카카오 로컬 API엔 "id로 상세 조회"가 없어서,
// URL에 ?sido=&sigungu= 슬러그를 같이 실어 보내 목록 조회 때 캐시된 45건 안에서 id로
// 찾는다(findDistrictRestaurantById). 목록에서 클릭해 들어온 경우 십중팔구 캐시 히트라
// 카카오 호출이 없다. sido/sigungu가 없으면(옛날 링크·직접 URL 입력) 원리상 이 id를
// 찾을 수 없으므로 조회 자체를 시도하지 않고 안내 화면을 보여준다(500/404 아님).

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
      <>
        <header className="w-full top-0 sticky z-50 bg-surface border-b border-outline-variant">
          <div className="flex items-center justify-between px-4 h-14 w-full max-w-md mx-auto">
            <Link
              href="/"
              aria-label="홈으로"
              className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container transition-colors active:scale-95 duration-150 text-primary"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold text-primary">식당 상세</h1>
            <span className="w-9" aria-hidden="true" />
          </div>
        </header>
        <main className="flex-grow w-full max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center">
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
      </>
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
    <>
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-50 bg-surface border-b border-outline-variant">
        <div className="flex items-center justify-between px-4 h-14 w-full max-w-md mx-auto">
          <Link
            href={backHref}
            aria-label="뒤로가기"
            className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container transition-colors active:scale-95 duration-150 text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline font-bold text-primary">식당 상세</h1>
          <span className="w-9" aria-hidden="true" />
        </div>
      </header>

      <main className="flex-grow w-full max-w-md mx-auto">
        {/* Hero Map — 좌표가 있을 때만 렌더링 (PRD F4 수용기준). 카카오맵 SDK 키(§14-G)가
            아직 없어 키 없이 쓸 수 있는 Leaflet + Esri 위성 타일로 위치를 보여준다. */}
        {hasCoords ? (
          <div className="w-full h-48 md:h-64 relative bg-surface-variant overflow-hidden">
            <RestaurantMap lat={restaurant.lat} lng={restaurant.lng} name={restaurant.name} />
          </div>
        ) : null}

        <div className="px-4 py-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-headline font-bold text-2xl text-on-surface mb-2">{restaurant.name}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label bg-primary text-on-primary">
                {CATEGORY_LABELS[restaurant.category]}
              </span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-outline mt-0.5">location_on</span>
              {restaurant.roadAddress ? (
                <div>
                  <p className="text-sm text-on-surface">{restaurant.roadAddress}</p>
                  {restaurant.jibunAddress && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{restaurant.jibunAddress}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-outline">위치 정보가 없습니다</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">call</span>
              <p className={`text-sm ${restaurant.phone ? "text-on-surface" : "text-outline"}`}>
                {restaurant.phone ?? "전화번호 없음"}
              </p>
            </div>
          </div>

          <DetailActions phone={restaurant.phone} address={restaurant.roadAddress ?? restaurant.jibunAddress ?? restaurant.name} />

          <section className="mb-8 border-t border-outline-variant pt-6">
            <h3 className="font-headline font-semibold text-lg text-on-surface mb-3">소개</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              등록된 소개 정보가 없습니다.{" "}
              <a href={restaurant.placeUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                카카오맵에서 더 보기
              </a>
            </p>
          </section>

          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
              <p className="text-xs leading-relaxed">
                이 정보는 카카오맵 제공 정보이며 실제와 다를 수 있습니다. 방문 전 확인을 권합니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-4 bg-surface-container-lowest border-t border-outline-variant mt-auto">
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2 font-body text-xs text-center text-on-surface-variant">
          <p>© 동네한끼. 데이터 출처: 카카오맵 (실시간 조회)</p>
        </div>
      </footer>
    </>
  );
}
