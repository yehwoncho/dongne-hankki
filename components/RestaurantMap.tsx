"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

declare global {
  interface Window {
    naver?: any;
  }
}

// 좌표가 있는 식당의 위치를 위성 이미지 위에 표시한다.
// NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정돼 있으면 네이버 지도 SDK(위성/하이브리드)를 쓰고,
// 없으면 키 없이 되는 Esri 위성 타일(Leaflet)로 자동 폴백한다.
export default function RestaurantMap({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  if (NAVER_CLIENT_ID) {
    return <NaverSatelliteMap lat={lat} lng={lng} name={name} clientId={NAVER_CLIENT_ID} />;
  }
  return <EsriSatelliteMap lat={lat} lng={lng} name={name} />;
}

// ── 네이버 지도 (Client ID 있을 때) ──────────────────────────────
function NaverSatelliteMap({
  lat,
  lng,
  name,
  clientId,
}: {
  lat: number;
  lng: number;
  name: string;
  clientId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.naver?.maps) return;

    const { naver } = window;
    const position = new naver.maps.LatLng(lat, lng);
    const map = new naver.maps.Map(containerRef.current, {
      center: position,
      zoom: 17,
      mapTypeId: naver.maps.MapTypeId.SATELLITE,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: naver.maps.MapTypeControlStyle.BUTTON,
        mapTypeIds: [naver.maps.MapTypeId.SATELLITE, naver.maps.MapTypeId.HYBRID, naver.maps.MapTypeId.NORMAL],
      },
    });

    new naver.maps.Marker({ position, map, title: name });

    return () => {
      map.destroy?.();
    };
  }, [scriptLoaded, lat, lng, name]);

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} className="w-full h-full" role="img" aria-label={`${name} 위성 지도`} />
    </>
  );
}

// ── Esri 위성 타일 폴백 (Client ID 없을 때, 키 불필요) ──────────────
function EsriSatelliteMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      map = L.map(containerRef.current, { center: [lat, lng], zoom: 17 });

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics" }
      ).addTo(map);

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#E8664B;border:2px solid white;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      L.marker([lat, lng], { icon: pinIcon }).addTo(map).bindPopup(name);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, name]);

  return <div ref={containerRef} className="w-full h-full" role="img" aria-label={`${name} 위성 지도`} />;
}
