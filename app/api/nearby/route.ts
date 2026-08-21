import { NextResponse } from "next/server";
import { geohashEncode } from "@/lib/geohash";
import { fetchNearby } from "@/lib/kakao";
import type { NearbyResponse } from "@/lib/types";

// F7 프록시 (PRD v0.2 §4.6, §8) — 카카오 REST 키는 이 파일에서만 쓰인다(클라이언트 미노출).
// 좌표를 geohash 6자리 버킷으로 뭉개 60초 캐시 — 동일 위치 연타 요청이 쿼터를 갉아먹지 않게 한다.
// ⚠️ §4.6 라이선스 제약: 카카오 결과는 DB에 영속 저장하지 않는다. 아래 캐시는 초 단위 TTL의
// 프로세스 메모리 캐시일 뿐이고(서버 재시작·재배포 시 소멸), 실 운영에서는 Vercel KV / Upstash로
// 교체한다(§9 기술선택) — 어느 쪽이든 "영속 저장"이 아니라 "짧은 TTL 캐시"라는 성격은 동일해야 한다.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; data: NearbyResponse }>();

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  const radius = Math.min(Math.max(Number(p.get("radius") ?? 1000) || 1000, 500), 2000);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
    return NextResponse.json(
      { error: { code: "INVALID_COORDS", message: "좌표가 올바르지 않습니다" } },
      { status: 400 }
    );
  }

  const bucket = geohashEncode(lat, lng, 6); // 좌표 그대로 캐시하지 않는다 (§4.6)
  const cacheKey = `${bucket}:${radius}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, { headers: { "Cache-Control": "public, max-age=60" } });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // F7 수용기준: 3초 타임아웃 (§6-F6)

    const { items, truncated } = await fetchNearby({ lat, lng, radius }, controller.signal);
    clearTimeout(timeout);

    const result: NearbyResponse = { items, center: { lat, lng }, radius, truncated, source: "kakao" };
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result }); // DB 영속 저장 금지 — 캐시만

    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json(
      { error: { code: "KAKAO_ERROR", message: "지금은 주변 정보를 불러올 수 없습니다" } },
      { status: 502 }
    );
  }
}
