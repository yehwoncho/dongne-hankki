// "카카오맵 제공" / "공공데이터 기준 …" 출처 배지 (PRD v0.2 §4.6, §9, §13 —
// F1~F3과 F7의 데이터 출처·신선도가 다르다는 것을 화면에서 항상 구분 표기하기 위한 공용 컴포넌트).
export default function SourceBadge({
  source,
  snapshotDate,
}: {
  source: "kakao" | "public-data";
  snapshotDate?: string;
}) {
  if (source === "kakao") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-label font-semibold text-[var(--muted-ink)] border border-[var(--ledger)]">
        카카오맵 제공
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-label font-semibold text-[var(--muted-ink)] border border-[var(--ledger)]">
      공공데이터 기준{snapshotDate ? ` ${snapshotDate}` : ""}
    </span>
  );
}
