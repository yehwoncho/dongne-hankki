// PRD §5.3 업태명 → 표준 카테고리 매핑을 그대로 옮김.
import type { Category } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  korean: "한식",
  chinese: "중식",
  japanese: "일식",
  western: "양식",
  asian: "아시안·기타",
  snack: "분식",
  cafe: "카페·디저트",
  bar: "술집",
  etc: "기타",
};

// 화면에 노출할 고정 순서 (Stitch 목록 화면과 동일한 칩 순서)
export const CATEGORY_ORDER: Category[] = [
  "korean", "chinese", "japanese", "western",
  "asian", "snack", "cafe", "bar", "etc",
];

// 우선순위 있는 규칙 배열 — 위에서부터 첫 매칭
const CATEGORY_RULES: [RegExp, Category][] = [
  [/카페|커피|제과|디저트|아이스크림|베이커리/, "cafe"],
  [/호프|주점|술집|바\b|포차|통닭/, "bar"],
  [/분식|김밥|떡볶이/, "snack"],
  [/중식|중국/, "chinese"],
  [/일식|초밥|스시|횟집|회집/, "japanese"],
  [/양식|경양식|이탈리|프렌치|스테이크|피자|패밀리/, "western"],
  [/베트남|태국|인도|동남아|아시안|외국/, "asian"],
  [/한식|백반|국밥|고기|곰탕|칼국수|족발|보쌈/, "korean"],
];

export function toCategory(raw?: string): Category {
  const s = (raw ?? "").replace(/\s/g, "");
  for (const [re, cat] of CATEGORY_RULES) if (re.test(s)) return cat;
  return "etc";
}

export function isCategory(value: string): value is Category {
  return (CATEGORY_ORDER as string[]).includes(value);
}
