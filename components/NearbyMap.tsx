"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { KakaoNearbyItem } from "@/lib/types";

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;

declare global {
  interface Window {
    kakao?: any;
  }
}

// F7 지도 — RestaurantMap.tsx(F4)와 같은 원칙: NEXT_PUBLIC_KAKAO_MAP_JS_KEY가 있으면
// 카카오맵 JS SDK(§4.6에서 "권장"한 지도), 없으면 키 없이 되는 Esri 위성 타일로 폴백한다.
// 지도 마커 ↔ 목록 카드 양방향 연동(F7 수용기준)을 위해 selectedId/onSelect를 props로 받는다.
export default function NearbyMap({
  items,
  center,
  selectedId,
  onSelect,
}: {
  items: KakaoNearbyItem[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (KAKAO_JS_KEY) {
    return (
      <KakaoSdkMap items={items} center={center} selectedId={selectedId} onSelect={onSelect} jsKey={KAKAO_JS_KEY} />
    );
  }
  return <EsriNearbyMap items={items} center={center} selectedId={selectedId} onSelect={onSelect} />;
}

// ── 카카오맵 JS SDK (Client Key 있을 때) ──────────────────────────────
function KakaoSdkMap({
  items,
  center,
  selectedId,
  onSelect,
  jsKey,
}: {
  items: KakaoNearbyItem[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
  jsKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;
    window.kakao.maps.load(() => {
      const { kakao } = window;
      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 5,
      });
      mapRef.current = map;

      // 현위치 마커 (파란 점)
      new kakao.maps.Circle({
        center: new kakao.maps.LatLng(center.lat, center.lng),
        radius: 6,
        strokeWeight: 2,
        strokeColor: "#4285F4",
        fillColor: "#4285F4",
        fillOpacity: 0.9,
      }).setMap(map);

      const markers = new Map<string, any>();
      items.forEach((item) => {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(item.lat, item.lng),
          map,
        });
        kakao.maps.event.addListener(marker, "click", () => onSelect(item.kakaoId));
        markers.set(item.kakaoId, marker);
      });
      markersRef.current = markers;
    });
  }, [scriptLoaded, items, center.lat, center.lng]);

  useEffect(() => {
    if (!selectedId || !mapRef.current || !window.kakao?.maps) return;
    const item = items.find((i) => i.kakaoId === selectedId);
    if (!item) return;
    mapRef.current.panTo(new window.kakao.maps.LatLng(item.lat, item.lng));
  }, [selectedId, items]);

  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`}
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} className="w-full h-full" role="img" aria-label="내 주변 맛집 지도" />
    </>
  );
}

// ── Esri 위성 타일 폴백 (Client Key 없을 때, 키 불필요) ──────────────
function EsriNearbyMap({
  items,
  center,
  selectedId,
  onSelect,
}: {
  items: KakaoNearbyItem[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());

  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { center: [center.lat, center.lng], zoom: 16 });
      mapRef.current = map;

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics" }
      ).addTo(map);

      // 현위치 마커
      L.circleMarker([center.lat, center.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: "#4285F4",
        fillOpacity: 1,
      }).addTo(map);

      const dotIcon = (selected: boolean) =>
        L.divIcon({
          className: "",
          html: `<div style="width:${selected ? 30 : 22}px;height:${selected ? 30 : 22}px;border-radius:50% 50% 50% 0;background:${
            selected ? "#8C4E41" : "#E8664B"
          };border:2px solid white;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
          iconSize: [selected ? 30 : 22, selected ? 30 : 22],
          iconAnchor: [(selected ? 30 : 22) / 2, selected ? 30 : 22],
        });

      const markers = new Map<string, import("leaflet").Marker>();
      items.forEach((item) => {
        const marker = L.marker([item.lat, item.lng], { icon: dotIcon(item.kakaoId === selectedId) })
          .addTo(map)
          .bindPopup(item.name)
          .on("click", () => onSelect(item.kakaoId));
        markers.set(item.kakaoId, marker);
      });
      markersRef.current = markers;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, center.lat, center.lng]);

  // 목록 카드 클릭 → 마커 하이라이트 + 지도 리센터 (F7 수용기준: 양방향 연동)
  useEffect(() => {
    if (!mapRef.current) return;
    const item = items.find((i) => i.kakaoId === selectedId);
    if (item) mapRef.current.panTo([item.lat, item.lng]);
  }, [selectedId, items]);

  return <div ref={containerRef} className="w-full h-full" role="img" aria-label="내 주변 맛집 지도" />;
}
