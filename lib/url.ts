import type { Category } from "./types";

// 목록 화면의 쿼리스트링(?cat=korean,snack&page=2)을 만드는 공용 헬퍼.
// PRD §9 "URL이 곧 결과다" 원칙 — 카테고리·페이지 상태는 항상 URL에 반영한다.
export function buildListHref(
  basePath: string,
  opts: { cats: Category[]; page?: number }
): string {
  const params = new URLSearchParams();
  if (opts.cats.length > 0) params.set("cat", opts.cats.join(","));
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
