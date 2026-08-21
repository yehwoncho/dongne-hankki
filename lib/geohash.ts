// F7 짧은 캐시용 좌표 버킷 (PRD v0.2 §4.6, §8, §9).
// 좌표를 그대로 캐시 키로 쓰지 않고 geohash로 뭉개서, 반경 몇 미터 안의 요청은
// 같은 캐시 엔트리를 공유하게 한다 — 표준 geohash 알고리즘(base32) 구현.

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function geohashEncode(lat: number, lng: number, precision = 6): string {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let evenBit = true; // 짝수 비트는 경도, 홀수 비트는 위도

  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        lngMin = mid;
      } else {
        ch = ch << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch = ch << 1;
        latMax = mid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}
