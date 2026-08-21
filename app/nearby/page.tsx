import Link from "next/link";
import NearbyView from "@/components/NearbyView";

// F7 "내 주변 맛집" (PRD v0.2 §6-F7, 신설) — 나머지 화면(F1~F4)과 같은 TopAppBar/Footer 셸을
// 서버 컴포넌트로 두고, 위치 권한·실시간 조회처럼 브라우저 API가 필요한 부분만 클라이언트 컴포넌트로 분리.
export const metadata = {
  title: "내 주변 맛집 — 동네한끼",
  description: "지금 내 위치에서 가까운 순으로, 카카오맵 데이터를 실시간으로 보여줍니다.",
};

export default function NearbyPage() {
  return (
    <>
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-40 bg-surface border-b border-outline-variant">
        <div className="flex items-center justify-between px-4 h-16 max-w-screen-md mx-auto">
          <Link
            href="/"
            aria-label="뒤로가기"
            className="text-on-surface-variant hover:bg-surface-container transition-colors rounded-full p-2 active:opacity-80"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>
              arrow_back
            </span>
          </Link>
          <h1 className="font-headline text-on-surface text-lg font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-xl">near_me</span>
            내 주변 맛집
          </h1>
          <span className="w-9" aria-hidden="true" />
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-screen-md w-full mx-auto">
        <NearbyView />

        <div className="w-full mt-auto flex flex-col items-center py-6 px-4 text-center bg-surface-container-lowest border-t border-outline-variant">
          <p className="font-body text-[10px] leading-relaxed text-on-surface-variant">
            © 동네한끼. 이 화면의 결과는 카카오맵 데이터를 실시간으로 조회하며 저장하지 않습니다.
          </p>
        </div>
      </main>
    </>
  );
}
