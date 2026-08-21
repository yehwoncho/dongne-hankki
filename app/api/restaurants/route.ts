import { NextResponse } from "next/server";
import { countByCategory, countRestaurants, districtSlugToName, findRestaurants, getMeta } from "@/lib/db";
import { isCategory } from "@/lib/category";
import { sidoBySlug } from "@/lib/region";
import type { Category } from "@/lib/types";

const PAGE_SIZE = 20;

// PRD §8 골격을 그대로 구현. 알 수 없는 파라미터는 무시하고(400 내지 않음), page는 상한 클램프.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;

  const sido = sidoBySlug(p.get("sido") ?? "");
  const sigungu = sido ? districtSlugToName(sido, p.get("sigungu") ?? "") : null;
  const cats = (p.get("cat") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isCategory) as Category[];

  const total = countRestaurants({ sido, sigungu, cats });
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Math.max(1, Number(p.get("page") ?? 1) || 1);
  const page = Math.min(requestedPage, lastPage);

  const items = findRestaurants({ sido, sigungu, cats, page, pageSize: PAGE_SIZE });
  const categories = countByCategory({ sido, sigungu });
  const meta = getMeta();

  return NextResponse.json(
    {
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      categories,
      snapshotDate: meta.snapshotDate,
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
  );
}
