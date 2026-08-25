import Link from "next/link";
import { redirect } from "next/navigation";
import { getRegionsForSido, getMeta } from "@/lib/db";
import { sidoBySlug } from "@/lib/region";
import DistrictList from "@/components/DistrictList";
import AuthWidget from "@/components/AuthWidget";

// F1② 시·군·구 선택 — Stitch "시·군·구 선택 - 서울 - 동네한끼" 화면(사용자가 헤더 타이틀을
// "지역 선택"으로 직접 수정한 최신본)을 그대로 포팅.
//
// "색인/장부(ledger)" 리디자인 — app/page.tsx(랜딩)와 톤을 맞춘다. 이 페이지는 랜딩과 다른
// 라우트 트리라 DOM을 상속받을 수 없으므로, 랜딩과 동일한 팔레트를 여기서도 그대로 스코프
// 선언한다(app/page.tsx의 PALETTE_VARS/SERIF와 값 동일, RecommendationSection.tsx처럼 같은
// 트리에서 상속받는 대신 이 페이지 자체가 루트라 재선언이 필요). 이 파일에만 적용되며
// tailwind.config.ts의 Stitch 토큰(다른 페이지)은 전혀 건드리지 않는다.
const PALETTE_VARS = {
  "--paper": "#FAFAF7",
  "--ink": "#1C1B1A",
  "--index-red": "#C81E3A",
  "--ledger": "#DDD9D2",
  "--muted-ink": "#6B6862",
} as React.CSSProperties;

const SERIF = '"Noto Serif KR", serif';

export default async function SidoPage({ params }: { params: Promise<{ sido: string }> }) {
  const { sido: sidoSlug } = await params;
  const sido = sidoBySlug(sidoSlug);
  // PRD §6 F1 수용기준: 잘못된 슬러그는 400이 아니라 지역 선택 화면으로 폴백.
  if (!sido) redirect("/");

  const districts = getRegionsForSido(sido);
  const meta = await getMeta();

  return (
    <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* TopAppBar — 배경/보더는 화면 끝까지, 안쪽 콘텐츠만 1280px로 캡(반응형 가운데 정렬) */}
      <header className="bg-[var(--paper)] w-full top-0 sticky z-40 border-b border-[var(--ledger)] transition-colors">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 h-16 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              aria-label="뒤로가기"
              className="touch-target flex-shrink-0 flex items-center justify-center text-[var(--muted-ink)] rounded-full hover:bg-[var(--ledger)]/30 hover:text-[var(--ink)] transition-colors active:opacity-80"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
                arrow_back
              </span>
            </Link>
            <h1 className="font-label text-lg font-bold text-[var(--ink)] truncate">지역 선택</h1>
          </div>
          <AuthWidget variant="inline" palette="index" />
        </div>
      </header>

      <main className="flex-1">
        <div className="bg-[var(--paper)]">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
            <div className="flex mb-4">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--ledger)] rounded-full text-sm font-label font-medium text-[var(--ink)] hover:border-[var(--index-red)] hover:text-[var(--index-red)] transition-colors active:scale-95 touch-target"
              >
                {sido}
                <span className="material-symbols-outlined text-[16px]">close</span>
              </Link>
            </div>
            <h2
              className="text-2xl font-bold text-[var(--ink)] mb-6 leading-[1.1] break-keep"
              style={{ fontFamily: SERIF }}
            >
              {sido}, 어디로 갈까요?
            </h2>

            <DistrictList sidoSlug={sidoSlug} districts={districts} />
          </div>
        </div>
      </main>

      <footer className="bg-[var(--paper)] w-full mt-auto border-t border-[var(--ledger)] py-6 px-4">
        <div className="max-w-screen-xl mx-auto flex flex-col items-center text-center">
          <p className="font-label text-[10px] leading-relaxed text-[var(--muted-ink)]">
            © 동네한끼. 공공데이터포털 기반 식당 전수 정보.
          </p>
          <div className="flex gap-2 font-label text-[10px] leading-relaxed text-[var(--muted-ink)] mt-1">
            <span>데이터 출처: 문화공공데이터광장</span>
            <span>·</span>
            <span>기준일 {meta.snapshotDate}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
