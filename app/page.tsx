import Link from "next/link";
import { getRegions, getMeta } from "@/lib/db";
import AuthWidget from "@/components/AuthWidget";

// F1① 시·도 선택 — "색인/장부(ledger)" 리디자인.
// 이 파일에만 적용되는 팔레트라 CSS 변수로 스코프한다(다른 페이지/컴포넌트는 여전히
// tailwind.config.ts의 Stitch 토큰 그대로). 포인트 컬러(--index-red)는 요청대로 딱
// 4곳(마스트헤드 로고, "어디서 드시나요?"의 "?", 장부 행 호버 탭, AuthWidget palette="index")
// 에서만 쓴다 — 다른 곳은 ink/muted-ink/ledger만 사용.
const PALETTE_VARS = {
  "--paper": "#FAFAF7",
  "--ink": "#1C1B1A",
  "--index-red": "#C81E3A",
  "--ledger": "#DDD9D2",
  "--muted-ink": "#6B6862",
} as React.CSSProperties;

const SERIF = '"Noto Serif KR", serif';

export default async function HomePage() {
  const regions = getRegions();
  const meta = await getMeta();

  return (
    <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* 한글을 지원하는 세리프 — 이 페이지 전용, layout.tsx/tailwind.config.ts는 안 건드리고
          페이지 자체에서 <link>를 렌더(Next App Router가 <head>로 자동 호이스트). */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700;900&display=swap"
      />

      {/* 유틸리티 바 — 로고 없이 내주변/로그인만. 마스트헤드는 아래 별도 섹션에서 화면을
          압도하는 크기로 보여준다(요청: "동네한끼"·"어디서 드시나요?" 둘 다 크게). */}
      <header className="w-full top-0 sticky bg-[var(--paper)] border-b border-[var(--ledger)] z-50">
        <div className="flex justify-end items-center px-4 sm:px-6 lg:px-8 py-3 max-w-screen-xl mx-auto gap-2">
          <Link
            href="/nearby"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--ledger)] text-sm font-label font-medium text-[var(--muted-ink)] hover:text-[var(--ink)] hover:bg-[var(--ledger)]/30 transition-colors touch-target"
          >
            <span className="material-symbols-outlined text-[18px]">near_me</span>
            내 주변
          </Link>
          <AuthWidget variant="inline" palette="index" />
        </div>
      </header>

      {/* 마스트헤드 — "동네한끼"를 화면을 압도하는 세리프 로고로. 포인트 컬러 허용 용도. */}
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16">
        <h1
          className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-[var(--index-red)] leading-[0.95] break-keep"
          style={{ fontFamily: SERIF }}
        >
          동네한끼
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--muted-ink)] font-body break-keep">
          광고도 순위도 없이, 그 지역 식당 전체 목록
        </p>
      </div>

      {/* 히어로 */}
      <main className="flex-grow w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-10 pt-6">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--muted-ink)] font-label mb-3">
            지역 선택
          </p>
          <h2
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--ink)] mb-4 leading-[1.05] break-keep"
            style={{ fontFamily: SERIF }}
          >
            어디서 드시나요<span className="text-[var(--index-red)]">?</span>
          </h2>
          <p className="text-[var(--muted-ink)] text-base md:text-lg max-w-md font-body break-keep">
            원하시는 지역을 선택해 주세요. 해당 지역의 모든 식당 정보를 가감 없이 보여드립니다.
          </p>
        </div>

        {/* 지역 장부 — 카드 그리드 대신 얇은 선으로만 구분되는 리스트. 넓은 화면에선
            멀티컬럼(전화번호부처럼 위→아래로 채우고 다음 칸으로 넘어감)으로 Step 2의
            넓은 폭을 "장부"답게 쓴다. */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-x-8 pb-12">
          {regions.map((region) => (
            <Link
              key={region.slug}
              href={`/${region.slug}`}
              className="group flex items-center justify-between gap-4 py-4 pl-3 -ml-3 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors break-inside-avoid"
            >
              <span className="font-bold text-[var(--ink)] text-lg font-body">{region.name}</span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="tabular-nums text-sm text-[var(--muted-ink)] font-label">
                  {region.count.toLocaleString("ko-KR")}곳
                </span>
                <span className="material-symbols-outlined text-[18px] text-[var(--muted-ink)] group-hover:text-[var(--ink)] transition-colors">
                  chevron_right
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mt-auto bg-[var(--paper)] border-t border-[var(--ledger)]">
        <div className="flex flex-col gap-2 p-6 text-center max-w-screen-xl mx-auto">
          <p className="font-label text-xs leading-relaxed text-[var(--muted-ink)]">
            © 동네한끼. 공공데이터포털 기반 식당 전수 정보 (현재는 화면 검증용 목데이터).
          </p>
          <div className="text-[10px] text-[var(--muted-ink)] mt-2 font-label">
            데이터 출처: 문화공공데이터광장 · 기준일 {meta.snapshotDate}
          </div>
        </div>
      </footer>
    </div>
  );
}
