import Link from "next/link";
import { redirect } from "next/navigation";
import { getRegionsForSido, getMeta } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";
import DistrictList from "@/components/DistrictList";

// F1② 시·군·구 선택 — Stitch "시·군·구 선택 - 서울 - 동네한끼" 화면(사용자가 헤더 타이틀을
// "지역 선택"으로 직접 수정한 최신본)을 그대로 포팅.
export default async function SidoPage({ params }: { params: Promise<{ sido: string }> }) {
  const { sido: sidoSlug } = await params;
  const sido = sidoBySlug(sidoSlug);
  // PRD §6 F1 수용기준: 잘못된 슬러그는 400이 아니라 지역 선택 화면으로 폴백.
  if (!sido) redirect("/");

  const districts = getRegionsForSido(sido);
  const meta = await getMeta();

  return (
    <>
      {/* TopAppBar */}
      <header className="bg-surface w-full top-0 sticky z-40 border-b border-outline-variant transition-colors flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="뒤로가기"
            className="touch-target flex items-center justify-center text-primary rounded-full hover:bg-surface-container transition-colors active:opacity-80"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="font-headline text-lg font-bold text-on-surface">지역 선택</h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="px-4 pt-6 pb-4 bg-surface-container-lowest">
          <div className="flex mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-container text-on-primary-container rounded-full text-sm font-label font-medium hover:bg-primary-fixed-dim transition-colors active:scale-95 touch-target"
            >
              {sido}
              <span className="material-symbols-outlined text-[16px]">close</span>
            </Link>
          </div>
          <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">{sido}, 어디로 갈까요?</h2>

          <DistrictList sidoSlug={sidoSlug} districts={districts} />
        </div>
      </main>

      <footer className="bg-surface-container-lowest w-full mt-auto py-6 px-4 flex flex-col items-center text-center">
        <p className="font-body text-[10px] leading-relaxed text-on-surface-variant">
          © 동네한끼. 공공데이터포털 기반 식당 전수 정보.
        </p>
        <div className="flex gap-2 font-body text-[10px] leading-relaxed text-on-surface-variant mt-1">
          <span>데이터 출처: 문화공공데이터광장</span>
          <span>·</span>
          <span>기준일 {meta.snapshotDate}</span>
        </div>
      </footer>
    </>
  );
}
