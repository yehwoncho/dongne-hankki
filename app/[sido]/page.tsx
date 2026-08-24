import Link from "next/link";
import { redirect } from "next/navigation";
import { getRegionsForSido, getMeta } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";
import DistrictList from "@/components/DistrictList";
import AuthWidget from "@/components/AuthWidget";

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
      {/* TopAppBar — 배경/보더는 화면 끝까지, 안쪽 콘텐츠만 1280px로 캡(반응형 가운데 정렬) */}
      <header className="bg-surface w-full top-0 sticky z-40 border-b border-outline-variant transition-colors">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 h-16 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              aria-label="뒤로가기"
              className="touch-target flex-shrink-0 flex items-center justify-center text-primary rounded-full hover:bg-surface-container transition-colors active:opacity-80"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                arrow_back
              </span>
            </Link>
            <h1 className="font-headline text-lg font-bold text-on-surface truncate">지역 선택</h1>
          </div>
          <AuthWidget variant="inline" />
        </div>
      </header>

      <main className="flex-1">
        <div className="bg-surface-container-lowest">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
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
        </div>
      </main>

      <footer className="bg-surface-container-lowest w-full mt-auto py-6 px-4">
        <div className="max-w-screen-xl mx-auto flex flex-col items-center text-center">
          <p className="font-body text-[10px] leading-relaxed text-on-surface-variant">
            © 동네한끼. 공공데이터포털 기반 식당 전수 정보.
          </p>
          <div className="flex gap-2 font-body text-[10px] leading-relaxed text-on-surface-variant mt-1">
            <span>데이터 출처: 문화공공데이터광장</span>
            <span>·</span>
            <span>기준일 {meta.snapshotDate}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
