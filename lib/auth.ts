// 재사용 가능한 인증 상태/로직.
//
// lib/savedPlaces.ts(사용자가 언급한, 아직 존재하지 않는 "담기" 기능)가 쓸 법한 패턴을
// 그대로 따른다: 모듈 스코프의 외부 스토어 + subscribe/getSnapshot/getServerSnapshot +
// useSyncExternalStore 훅. React 상태(useState)가 아니라 이 방식을 쓰는 이유는 여러
// 컴포넌트(헤더의 AuthWidget, 나중에 담기 버튼 등)가 컨텍스트 프로바이더 없이도 같은
// 로그인 상태를 구독할 수 있게 하기 위해서다.
//
// 비밀번호 검증·해싱은 이 파일에 전혀 없다 — 전부 supabase.auth.* 호출 결과를 그대로
// 쓰고, 에러 메시지만 한국어로 옮긴다.

import { useSyncExternalStore } from "react";
import { supabase } from "./supabase-client";

export interface AuthUser {
  id: string;
  email: string;
  /** 회원가입 모달에 이름 입력란이 없어 이메일 @ 앞부분으로 화면 표시용 이름을 파생한다. */
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

function toAuthUser(supabaseUser: { id: string; email?: string | null } | null | undefined): AuthUser | null {
  if (!supabaseUser?.email) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.email.split("@")[0],
  };
}

// 고정된 초기 상태 상수 — lib/savedPlaces.ts의 EMPTY 패턴과 동일하게, 매번 새 객체를
// 만들지 않고 이 하나의 참조를 계속 재사용한다. getServerSnapshot()이 매 호출마다 새
// 객체({ user: null, loading: true })를 리턴하면 참조가 계속 달라져서 React가 "무한
// 루프일 수 있다"고 판단해 "The result of getServerSnapshot should be cached" 에러를
// 던진다 — 서버 스냅샷과 초기 클라이언트 상태 둘 다 이 상수를 그대로 반환하게 해서 해결.
const INITIAL_STATE: AuthState = { user: null, loading: true };

let state: AuthState = INITIAL_STATE;
const listeners = new Set<() => void>();
let started = false;

function emit() {
  for (const listener of listeners) listener();
}

function setState(next: AuthState) {
  state = next;
  emit();
}

/** 최초 구독 시 한 번만 세션을 불러오고, 이후 변경을 계속 구독한다. */
function ensureStarted() {
  if (started) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    setState({ user: toAuthUser(data.session?.user), loading: false });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    setState({ user: toAuthUser(session?.user), loading: false });
  });
}

function subscribe(listener: () => void): () => void {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AuthState {
  return state;
}

/** 서버에는 localStorage 세션이 없으니 항상 "로딩 중"으로 고정 — 클라이언트 첫 렌더와
 * 일치시켜 하이드레이션 불일치를 막는다. 실제 값은 마운트 후 ensureStarted()가 채운다.
 * 매번 새 객체를 만들면 안 되므로(무한 루프 경고 원인) 고정된 INITIAL_STATE 참조를 그대로 리턴. */
function getServerSnapshot(): AuthState {
  return INITIAL_STATE;
}

/** 컴포넌트에서 로그인 상태를 구독한다. */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 훅 없이(이벤트 핸들러 등에서) 현재 로그인 사용자를 즉시 읽는다.
 * 나중에 "담기" 같은 기능이 그대로 가져다 쓸 수 있게 만든 진입점. */
export function getCurrentUser(): AuthUser | null {
  return state.user;
}

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }
  if (
    message.includes("User already registered") ||
    message.includes("already registered") ||
    message.includes("already exists") // 실제 Supabase 런타임 메시지("cannot be created again as it already exists")
  ) {
    return "이미 가입된 이메일이에요.";
  }
  if (message.includes("Password should be at least")) {
    return "비밀번호는 최소 6자 이상이어야 해요.";
  }
  if (message.includes("Unable to validate email") || (message.includes("invalid") && message.includes("mail"))) {
    return "올바른 이메일 형식이 아니에요.";
  }
  if (message.includes("Email not confirmed")) {
    return "이메일 인증이 필요한 계정이에요. 가입 시 받은 메일을 확인해주세요.";
  }
  return "문제가 발생했어요. 잠시 후 다시 시도해주세요.";
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? mapAuthError(error.message) : null };
}

export async function signUp(email: string, password: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: mapAuthError(error.message) };
  }
  // 프로젝트의 "이메일 인증" 설정이 꺼져 있으면 signUp 응답에 세션이 바로 온다.
  // 혹시 세션이 없으면(설정이 켜져 있는 경우) 곧바로 로그인을 한 번 더 시도해
  // "가입하면 바로 로그인 상태"를 최대한 만족시킨다.
  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return { error: mapAuthError(signInError.message) };
    }
  }
  return { error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ── 로그인 모달 열림 상태 ────────────────────────────────────────────
// components/AuthWidget.tsx의 기존 모달을 그대로 재사용하면서, 다른 컴포넌트(담기 버튼
// 등)에서도 "로그인해주세요" 흐름으로 그 모달을 열 수 있게 열림 여부만 여기로 옮긴다.
// boolean이라 getServerSnapshot이 매번 같은 원시값을 반환해 무한 루프 문제가 없다.

let modalOpen = false;
const modalListeners = new Set<() => void>();

function emitModal() {
  for (const listener of modalListeners) listener();
}

export function openAuthModal(): void {
  modalOpen = true;
  emitModal();
}

export function closeAuthModal(): void {
  modalOpen = false;
  emitModal();
}

function subscribeModal(listener: () => void): () => void {
  modalListeners.add(listener);
  return () => modalListeners.delete(listener);
}

function getModalSnapshot(): boolean {
  return modalOpen;
}

function getModalServerSnapshot(): boolean {
  return false;
}

/** 로그인 모달이 열려 있는지 구독한다. */
export function useAuthModalOpen(): boolean {
  return useSyncExternalStore(subscribeModal, getModalSnapshot, getModalServerSnapshot);
}
