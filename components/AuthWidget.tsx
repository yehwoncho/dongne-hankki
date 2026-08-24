"use client";

// 로그인 위젯. 두 가지 배치 모드를 지원한다:
// - variant="inline"(기본 아님, 명시적으로 넘김): 헤더가 있는 페이지에서 그 헤더의 flex
//   흐름 안에 정상 배치되는 문서 흐름 요소. 헤더의 다른 요소(뒤로가기/타이틀/기존 우측
//   버튼 등)와 실제로 공간을 나눠 쓰기 때문에 겹치지 않는다.
// - variant="fixed"(기본값): 헤더가 없는 페이지(예: /memo) 전용 — 뷰포트 기준 오른쪽 위
//   고정 오버레이. 예전엔 이걸 app/layout.tsx에서 전역으로 썼는데, 헤더가 있는 페이지의
//   기존 우측 요소(예: 홈의 "내 주변" 링크)와 겹치는 문제가 있어서 헤더별로 옮겼다.
//
// 로그인 상태 표시(하트+맛집주머니+이름+로그아웃)는 모바일 폭(~375px)에서도 헤더 안에
// 들어가야 해서, md 미만에서는 "맛집주머니" 라벨을 아이콘만 남기고 이름은 잘라낸다.
//
// palette="index"(기본 아님, 홈 랜딩 페이지의 "색인/장부" 리디자인 전용): 모양(둥근 pill,
// 레이아웃, 모달 구조)은 절대 안 바꾸고 색 클래스만 이 페이지의 CSS 변수
// (--paper/--ink/--index-red/--ledger/--muted-ink, app/page.tsx가 상위 DOM에 선언)로
// 바꿔치기한다. 다른 페이지는 이 prop을 안 넘기니(기본값 "default") 기존 Stitch 팔레트
// 그대로 100% 유지된다.

import { useState } from "react";
import Link from "next/link";
import { useAuth, useAuthModalOpen, openAuthModal, closeAuthModal, signIn, signUp, signOut } from "@/lib/auth";

type Palette = "default" | "index";

export default function AuthWidget({
  variant = "fixed",
  palette = "default",
}: {
  variant?: "fixed" | "inline";
  palette?: Palette;
}) {
  const { user, loading } = useAuth();
  // 모달 열림 상태는 lib/auth.ts의 외부 스토어에 있다 — 담기 버튼 같은 다른 컴포넌트도
  // openAuthModal()로 이 모달을 그대로 열 수 있게 하기 위해서다.
  const modalOpen = useAuthModalOpen();

  const wrapperClassName =
    variant === "fixed" ? "fixed top-3 right-3 md:top-4 md:right-4 z-[100]" : "flex-shrink-0";

  const pillClassName =
    palette === "index"
      ? "flex items-center gap-1 md:gap-2 bg-[var(--paper)]/95 backdrop-blur border border-[var(--ledger)] rounded-full pl-2 md:pl-3 pr-1.5 py-1.5"
      : "flex items-center gap-1 md:gap-2 bg-surface/95 backdrop-blur border border-outline-variant rounded-full pl-2 md:pl-3 pr-1.5 py-1.5 shadow-sm";
  const mypageLinkClassName =
    palette === "index"
      ? "touch-target px-1.5 md:px-2 flex items-center gap-1 text-sm font-label font-medium text-[var(--muted-ink)] hover:text-[var(--index-red)] transition-colors rounded-full"
      : "touch-target px-1.5 md:px-2 flex items-center gap-1 text-sm font-label font-medium text-on-surface-variant hover:text-primary transition-colors rounded-full";
  const nameClassName =
    palette === "index"
      ? "text-sm font-label text-[var(--ink)] max-w-[64px] md:max-w-none truncate"
      : "text-sm font-label text-on-surface max-w-[64px] md:max-w-none truncate";
  const signOutClassName =
    palette === "index"
      ? "touch-target px-1.5 md:px-2 text-sm font-label font-medium text-[var(--muted-ink)] hover:text-[var(--index-red)] transition-colors rounded-full"
      : "touch-target px-1.5 md:px-2 text-sm font-label font-medium text-on-surface-variant hover:text-primary transition-colors rounded-full";
  const loginButtonClassName =
    palette === "index"
      ? "touch-target px-4 rounded-md bg-[var(--index-red)] text-[var(--paper)] text-sm font-label font-medium hover:opacity-90 transition-opacity"
      : "touch-target px-4 rounded-full bg-primary text-on-primary text-sm font-label font-medium shadow-sm hover:opacity-90 transition-opacity";

  return (
    <div className={wrapperClassName}>
      {loading ? (
        // 최초 세션 확인 전 — 자리만 예약해 레이아웃이 튀지 않게 한다. SSR 스냅샷과 동일.
        <div className="h-9" aria-hidden="true" />
      ) : user ? (
        <div className={pillClassName}>
          <Link href="/mypage" aria-label="맛집주머니" className={mypageLinkClassName}>
            <span className="material-symbols-outlined text-[18px]">favorite</span>
            <span className="hidden md:inline">맛집주머니</span>
          </Link>
          <span className={nameClassName}>{user.name}님</span>
          <button type="button" onClick={() => signOut()} className={signOutClassName}>
            로그아웃
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => openAuthModal()} className={loginButtonClassName}>
          로그인
        </button>
      )}

      {modalOpen && <AuthModal onClose={() => closeAuthModal()} palette={palette} />}
    </div>
  );
}

function AuthModal({ onClose, palette }: { onClose: () => void; palette: Palette }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"login" | "signup" | null>(null);

  async function handleLogin() {
    if (pending) return;
    setPending("login");
    setError(null);
    const { error } = await signIn(email, password);
    setPending(null);
    if (error) {
      setError(error);
      return;
    }
    onClose();
  }

  async function handleSignup() {
    if (pending) return;
    setPending("signup");
    setError(null);
    const { error } = await signUp(email, password);
    setPending(null);
    if (error) {
      setError(error);
      return;
    }
    onClose();
  }

  const panelClassName =
    palette === "index"
      ? "mt-14 w-full max-w-sm bg-[var(--paper)] shadow-xl border border-[var(--ledger)] p-5"
      : "mt-14 w-full max-w-sm bg-surface rounded-xl shadow-xl border border-outline-variant p-5";
  const titleClassName =
    palette === "index" ? "font-headline text-lg font-bold text-[var(--ink)]" : "font-headline text-lg font-bold text-on-surface";
  const closeButtonClassName =
    palette === "index"
      ? "touch-target flex items-center justify-center text-[var(--muted-ink)] hover:bg-[var(--ledger)]/40 rounded-full transition-colors"
      : "touch-target flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors";
  const labelClassName = palette === "index" ? "text-sm font-label text-[var(--muted-ink)]" : "text-sm font-label text-on-surface-variant";
  const inputClassName =
    palette === "index"
      ? "w-full px-3 py-2 rounded-md border border-[var(--ledger)] text-[var(--ink)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--index-red)]"
      : "w-full px-3 py-2 rounded-lg border border-outline-variant text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary";
  const errorClassName = palette === "index" ? "text-sm text-[var(--index-red)]" : "text-sm text-error";
  const submitClassName =
    palette === "index"
      ? "touch-target flex-1 rounded-md bg-[var(--index-red)] text-[var(--paper)] text-sm font-label font-medium disabled:opacity-50 transition-opacity"
      : "touch-target flex-1 rounded-full bg-primary text-on-primary text-sm font-label font-medium disabled:opacity-50 transition-opacity";
  const signupClassName =
    palette === "index"
      ? "touch-target flex-1 rounded-md border border-[var(--index-red)] text-[var(--index-red)] text-sm font-label font-medium disabled:opacity-50 transition-opacity"
      : "touch-target flex-1 rounded-full border border-primary text-primary text-sm font-label font-medium disabled:opacity-50 transition-opacity";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[110] flex items-start justify-end p-3 md:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="로그인"
        onClick={(e) => e.stopPropagation()}
        className={panelClassName}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={titleClassName}>로그인</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className={closeButtonClassName}>
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="flex flex-col gap-3"
        >
          <label className="flex flex-col gap-1">
            <span className={labelClassName}>이메일</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClassName}>비밀번호</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
            />
          </label>

          {error && (
            <p className={errorClassName} role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button type="submit" disabled={pending !== null} className={submitClassName}>
              {pending === "login" ? "로그인 중..." : "로그인"}
            </button>
            <button type="button" onClick={handleSignup} disabled={pending !== null} className={signupClassName}>
              {pending === "signup" ? "가입하는 중..." : "회원가입"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
