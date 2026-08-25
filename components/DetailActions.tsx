"use client";

import { useState } from "react";

// F4 액션 버튼 4종 — Stitch 상세 화면 그대로. 전화/주소복사만 클라이언트 동작이 필요해 이 부분만 분리.
export default function DetailActions({
  phone,
  address,
}: {
  phone: string | null;
  address: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 API 실패 폴백: 주소는 이미 상세 화면에 일반 텍스트로 노출되어 있어
      // 사용자가 직접 드래그해 선택·복사할 수 있다 (PRD F4 수용기준).
    }
  }

  const kakaoUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;

  return (
    <div className="grid grid-cols-4 gap-2 mb-8">
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="flex flex-col items-center justify-center gap-1 p-2 border border-[var(--ledger)] hover:border-[var(--index-red)] transition-colors min-h-[44px]"
        >
          <span className="material-symbols-outlined text-[var(--index-red)]">call</span>
          <span className="text-[10px] font-label text-[var(--muted-ink)]">전화</span>
        </a>
      ) : (
        <span
          className="flex flex-col items-center justify-center gap-1 p-2 border border-[var(--ledger)]/50 min-h-[44px] opacity-40 cursor-not-allowed"
          aria-disabled="true"
        >
          <span className="material-symbols-outlined text-[var(--muted-ink)]/40">call</span>
          <span className="text-[10px] font-label text-[var(--muted-ink)]">전화없음</span>
        </span>
      )}

      <button
        type="button"
        onClick={handleCopy}
        className="flex flex-col items-center justify-center gap-1 p-2 border border-[var(--ledger)] hover:border-[var(--index-red)] transition-colors min-h-[44px]"
      >
        <span className="material-symbols-outlined text-[var(--index-red)]">{copied ? "check" : "content_copy"}</span>
        <span className="text-[10px] font-label text-[var(--muted-ink)]">{copied ? "복사됨" : "주소복사"}</span>
      </button>

      <a
        href={kakaoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-1 p-2 border border-[var(--ledger)] hover:border-[var(--index-red)] transition-colors min-h-[44px]"
      >
        <span className="material-symbols-outlined text-[var(--index-red)]">map</span>
        <span className="text-[10px] font-label text-[var(--muted-ink)]">카카오맵</span>
      </a>

      <a
        href={naverUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-1 p-2 border border-[var(--ledger)] hover:border-[var(--index-red)] transition-colors min-h-[44px]"
      >
        <span className="material-symbols-outlined text-[var(--index-red)]">location_on</span>
        <span className="text-[10px] font-label text-[var(--muted-ink)]">네이버지도</span>
      </a>
    </div>
  );
}
