import Link from "next/link";

// PRD F6: 상세 ID 없음 → 404 페이지 + 목록으로 돌아가기.
export default function RestaurantNotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
      <span className="material-symbols-outlined text-6xl text-outline-variant" style={{ fontVariationSettings: "'wght' 200" }}>
        restaurant
      </span>
      <h1 className="text-xl font-bold font-headline text-on-surface">식당 정보를 찾을 수 없어요</h1>
      <p className="text-sm text-on-surface-variant max-w-[280px]">
        폐업했거나 잘못된 링크일 수 있어요. 지역을 다시 선택해 주세요.
      </p>
      <Link
        href="/"
        className="h-12 px-6 rounded-lg border border-primary text-primary font-label font-semibold flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors"
      >
        지역 선택으로 돌아가기
      </Link>
    </main>
  );
}
