import Link from "next/link";
import type { Category } from "@/lib/types";
import { buildListHref } from "@/lib/url";

// F6 예외 상태 — 결과 0건. Stitch "식당 목록 - 결과 없음" 화면의 본문 블록을 그대로 포팅.
export default function EmptyState({
  basePath,
  sigunguName,
  selectedCats,
  sidoSlug,
}: {
  basePath: string;
  sigunguName: string;
  selectedCats: Category[];
  sidoSlug: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <span
        className="material-symbols-outlined text-6xl text-outline-variant mb-6"
        style={{ fontVariationSettings: "'wght' 200" }}
      >
        search_off
      </span>
      <h2 className="text-xl font-bold font-headline text-on-surface mb-2">조건에 맞는 식당이 없어요</h2>
      <p className="text-sm text-on-surface-variant mb-8 max-w-[250px] leading-relaxed">
        카테고리를 해제하거나
        <br />
        상위 지역에서 찾아보세요
      </p>
      <div className="w-full max-w-[280px] flex flex-col space-y-3">
        {selectedCats.length > 0 && (
          <Link
            href={buildListHref(basePath, { cats: [] })}
            className="w-full h-12 rounded-lg border border-primary text-primary font-label font-semibold flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
          >
            카테고리 해제
          </Link>
        )}
        <Link
          href={`/${sidoSlug}`}
          className="w-full h-12 rounded-lg border border-outline text-on-surface font-label font-semibold flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95"
        >
          다른 지역 보기
        </Link>
      </div>
    </div>
  );
}
