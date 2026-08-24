import Link from "next/link";
import { getRegions, getMeta } from "@/lib/db";

// F1① 시·도 선택 — Stitch "지역 선택 - 동네한끼" 화면을 그대로 포팅.
export default async function HomePage() {
  const regions = getRegions();
  const meta = await getMeta();

  return (
    <>
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-surface border-b border-outline-variant z-50">
        <div className="flex justify-between items-center px-4 py-3 max-w-screen-md mx-auto">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-2xl">
              restaurant
            </span>
            <div className="flex flex-col">
              <h1 className="font-headline text-on-surface text-xl font-bold tracking-tight">동네한끼</h1>
              <p className="text-[10px] text-on-surface-variant leading-none mt-0.5 font-label">
                광고도 순위도 없이, 그 지역 식당 전체 목록
              </p>
            </div>
          </div>
          {/* F7 진입점 (v0.2 신설) — 지역을 고르는 대신 지금 위치 기준으로 바로 찾고 싶을 때 */}
          <Link
            href="/nearby"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-outline-variant text-sm font-label font-medium text-on-surface-variant hover:border-primary hover:text-primary transition-colors touch-target"
          >
            <span className="material-symbols-outlined text-[18px]">near_me</span>
            내 주변
          </Link>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-screen-md mx-auto px-4 py-8 md:py-12">
        <div className="mb-10 text-center md:text-left pt-6">
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface mb-3 tracking-tight">
            어디서 드시나요?
          </h2>
          <p className="text-on-surface-variant text-base md:text-lg max-w-md">
            원하시는 지역을 선택해 주세요. 해당 지역의 모든 식당 정보를 가감 없이 보여드립니다.
          </p>
        </div>

        {/* Region Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4 pb-12">
          {regions.map((region) => (
            <Link
              key={region.slug}
              href={`/${region.slug}`}
              className="group flex flex-col items-center justify-center p-4 min-h-[88px] bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200"
            >
              <span className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                {region.name}
              </span>
              <span className="text-xs text-on-surface-variant mt-1 font-label">
                {region.count.toLocaleString("ko-KR")}곳
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mt-auto bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex flex-col gap-2 p-6 text-center max-w-screen-md mx-auto">
          <p className="font-label text-xs leading-relaxed text-on-surface-variant">
            © 동네한끼. 공공데이터포털 기반 식당 전수 정보 (현재는 화면 검증용 목데이터).
          </p>
          <div className="text-[10px] text-outline mt-2 font-label">
            데이터 출처: 문화공공데이터광장 · 기준일 {meta.snapshotDate}
          </div>
        </div>
      </footer>
    </>
  );
}
