import { NextResponse } from "next/server";
import {
  countByCategory,
  countRestaurants,
  DistrictLookupError,
  districtSlugToName,
  findRestaurants,
  getMeta,
} from "@/lib/db";
import { isCategory } from "@/lib/category";
import { sidoBySlug } from "@/lib/region";
import type { Category } from "@/lib/types";

const PAGE_SIZE = 20;

// PRD §8 골격을 그대로 구현. 알 수 없는 파라미터는 무시하고(400 내지 않음), page는 상한 클램프.
//
// ⚠️ 카카오 전환(2단계) 이후: 카카오는 좌표+반경만 받기 때문에 sido/sigungu 없이 부르던
// "전국 조회" 모드는 더 이상 지원하지 않는다 — sido/sigungu 미지정은 400, 카카오 주소
// 검색 실패 등은 502로 응답한다 (기존엔 mock 전체를 필터 없이 돌려줬다).
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;

  const sido = sidoBySlug(p.get("sido") ?? "");
  const sigungu = sido ? districtSlugToName(sido, p.get("sigungu") ?? "") : null;
  const cats = (p.get("cat") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(isCategory) as Category[];

  try {
    const total = await countRestaurants({ sido, sigungu, cats });
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const requestedPage = Math.max(1, Number(p.get("page") ?? 1) || 1);
    const page = Math.min(requestedPage, lastPage);

    const items = await findRestaurants({ sido, sigungu, cats, page, pageSize: PAGE_SIZE });
    const categories = await countByCategory({ sido, sigungu });
    const meta = await getMeta(sido, sigungu);

    return NextResponse.json(
      {
        items,
        total,
        page,
        pageSize: PAGE_SIZE,
        categories,
        snapshotDate: meta.snapshotDate,
        truncated: meta.truncated, // 45건 상한에 걸렸는지 — true면 전수 목록이 아님
      },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    if (err instanceof DistrictLookupError) {
      const status = err.code === "MISSING_REGION" ? 400 : 502;
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status }
      );
    }
    throw err;
  }
}
