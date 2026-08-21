// F3 수용기준: 로딩 시 스피너가 아니라 스켈레톤 카드 5개, 레이아웃 시프트 없음.
export default function ListLoading() {
  return (
    <main className="flex-1 flex flex-col animate-pulse">
      <div className="px-4 py-4 flex justify-between items-center border-b border-surface-variant">
        <div className="h-4 w-20 bg-surface-container rounded" />
        <div className="h-4 w-16 bg-surface-container rounded" />
      </div>
      <ul className="flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="px-4 py-5 border-b border-surface-variant">
            <div className="h-4 w-1/3 bg-surface-container rounded mb-3" />
            <div className="h-3 w-2/3 bg-surface-container rounded mb-2" />
            <div className="h-3 w-1/2 bg-surface-container rounded" />
          </li>
        ))}
      </ul>
    </main>
  );
}
