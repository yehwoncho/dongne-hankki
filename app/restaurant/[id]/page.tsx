import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { districtNameToSlug, getRestaurantById } from "@/lib/db";
import { slugBySido } from "@/lib/region";
import { CATEGORY_LABELS } from "@/lib/category";
import DetailActions from "@/components/DetailActions";
import RestaurantMap from "@/components/RestaurantMap";

// F4 식당 상세 — Stitch "식당 상세 - 스시오마카세 - 동네한끼" 화면을 그대로 포팅.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const restaurant = getRestaurantById(id);
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = getRestaurantById(id);
  if (!restaurant) notFound(); // PRD F6: 상세 ID 없음 → 404 페이지 + 목록으로 돌아가기

  const sidoSlug = slugBySido(restaurant.sido);
  const sigunguSlug = districtNameToSlug(restaurant.sido, restaurant.sigungu);
  const backHref = `/${sidoSlug}/${sigunguSlug}`;
  const hasCoords = restaurant.lat !== null && restaurant.lng !== null;

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
            <RestaurantMap lat={restaurant.lat!} lng={restaurant.lng!} name={restaurant.name} />
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
              {restaurant.intro ?? "등록된 소개 정보가 없습니다."}
            </p>
          </section>

          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
              <p className="text-xs leading-relaxed">
                이 정보는 공공데이터 기준({restaurant.snapshotDate})이며 실제와 다를 수 있습니다. 방문 전 확인을 권합니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 px-4 bg-surface-container-lowest border-t border-outline-variant mt-auto">
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-2 font-body text-xs text-center text-on-surface-variant">
          <p>© 동네한끼. 데이터 출처: 문화공공데이터광장 (기준일 {restaurant.snapshotDate})</p>
        </div>
      </footer>
    </>
  );
}
