import Link from "next/link";
import NearbyView from "@/components/NearbyView";
import AuthWidget from "@/components/AuthWidget";

// F7 "내 주변 맛집" (PRD v0.2 §6-F7, 신설) — 나머지 화면(F1~F4)과 같은 TopAppBar/Footer 셸을
// 서버 컴포넌트로 두고, 위치 권한·실시간 조회처럼 브라우저 API가 필요한 부분만 클라이언트 컴포넌트로 분리.
//
// "색인/장부(ledger)" 리디자인 — app/page.tsx(랜딩) 등 다른 화면과 톤을 맞춘다. 팔레트 값은
// 동일, 별도 라우트 트리라 재선언 필요. 지도(components/NearbyMap.tsx) 자체는 건드리지 않는다
// — 여기서 바꾸는 건 지도를 감싸는 페이지 쪽 컨테이너 배경뿐(components/NearbyView.tsx 안).
const PALETTE_VARS = {
  "--paper": "#FAFAF7",
  "--ink": "#1C1B1A",
  "--index-red": "#C81E3A",
  "--ledger": "#DDD9D2",
  "--muted-ink": "#6B6862",
} as React.CSSProperties;

export const metadata = {
  title: "내 주변 맛집 — 동네한끼",
  description: "지금 내 위치에서 가까운 순으로, 카카오맵 데이터를 실시간으로 보여줍니다.",
};

export default function NearbyPage() {
  return (
    <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-40 bg-[var(--paper)] border-b border-[var(--ledger)]">
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 lg:px-8 h-16 max-w-screen-xl mx-auto">
          <Link
            href="/"
            aria-label="뒤로가기"
            className="text-[var(--muted-ink)] hover:bg-[var(--ledger)]/30 hover:text-[var(--ink)] transition-colors rounded-full p-2 active:opacity-80 flex-shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="font-label text-[var(--ink)] text-lg font-bold flex-1 min-w-0 flex items-center justify-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-[var(--index-red)] text-xl flex-shrink-0">near_me</span>
            내 주변 맛집
          </h1>
          <AuthWidget variant="inline" palette="index" />
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-screen-xl w-full mx-auto">
        <NearbyView />

        <div className="w-full mt-auto flex flex-col items-center py-6 px-4 text-center bg-[var(--paper)] border-t border-[var(--ledger)]">
          <p className="font-label text-[10px] leading-relaxed text-[var(--muted-ink)]">
            © 동네한끼. 이 화면의 결과는 카카오맵 데이터를 실시간으로 조회하며 저장하지 않습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
