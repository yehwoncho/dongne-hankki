import { NextResponse } from "next/server";
import { getRestaurantById } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = getRestaurantById(id);
  if (!restaurant) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "식당을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }
  return NextResponse.json(restaurant, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
