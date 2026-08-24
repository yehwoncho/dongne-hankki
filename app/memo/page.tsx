"use client";

export const dynamic = 'force-dynamic';

// 독립 라우트: /memo
// 이 파일 하나로 화면 전체(스타일 포함)를 구성한다. 기존 라우트·컴포넌트·설정은 건드리지 않는다.
// 데이터: MCP로 연결된 Supabase 프로젝트의 public.memos 테이블 (text, created_at만 저장).
// 디자인: notion-design.md 스펙(색·타이포·여백·모션·접근성)을 그대로 반영.

import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AuthWidget from "@/components/AuthWidget";

// .env.local에 이미 채워져 있는 값을 읽는다. NEXT_PUBLIC_ 접두사라 빌드 시 클라이언트 번들에
// 인라인되므로 "use client" 컴포넌트에서 process.env로 바로 참조할 수 있다.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;
let warnedMissingConfig = false;

/** 첫 호출 시점에만 클라이언트를 만들고 이후엔 캐시된 인스턴스를 재사용한다. 모듈 로드
 * 시점에 곧바로 createClient()를 부르면, 배포 환경에 위 두 값이 빠져 있을 때 이 파일을
 * 렌더링하는 것만으로 "supabaseUrl is required" 에러로 빌드/렌더링 자체가 죽는다. 값이
 * 없으면 클라이언트를 만들지 않고 콘솔에 한 번만 에러를 남긴 뒤 null을 반환해, 호출부가
 * 화면에서 안내하게 한다. */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!warnedMissingConfig) {
      console.error(
        "[memo] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. 메모 기능이 비활성화됩니다."
      );
      warnedMissingConfig = true;
    }
    return null;
  }
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

const CONFIG_ERROR_MESSAGE = "설정 오류로 메모 기능을 지금 사용할 수 없어요.";

// notion-design.md §2 폰트 스택 — 이 프로젝트 전역 폰트(Inter)와 별개로 시스템 폰트를 그대로 쓴다.
const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

interface Memo {
  id: string;
  text: string;
  created_at: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours24 = d.getHours();
  const ampm = hours24 < 12 ? "오전" : "오후";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${ampm} ${hours12}:${minutes}`;
}

export default function MemoPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      if (!supabase) {
        setError(CONFIG_ERROR_MESSAGE);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("memos")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError("메모를 불러오지 못했어요.");
      } else {
        setMemos(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd() {
    const trimmed = newText.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAdding(false);
      setError(CONFIG_ERROR_MESSAGE);
      return;
    }
    const { data, error } = await supabase
      .from("memos")
      .insert({ text: trimmed })
      .select()
      .single();
    setAdding(false);
    if (error || !data) {
      setError("메모를 저장하지 못했어요.");
      return;
    }
    setMemos((prev) => [data, ...prev]);
    setNewText("");
  }

  function startEdit(memo: Memo) {
    setConfirmDeleteId(null);
    setEditingId(memo.id);
    setEditText(memo.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed || savingEdit) return;
    setSavingEdit(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSavingEdit(false);
      setError(CONFIG_ERROR_MESSAGE);
      return;
    }
    const { data, error } = await supabase
      .from("memos")
      .update({ text: trimmed })
      .eq("id", id)
      .select()
      .single();
    setSavingEdit(false);
    if (error || !data) {
      setError("메모를 수정하지 못했어요.");
      return;
    }
    setMemos((prev) => prev.map((m) => (m.id === id ? data : m)));
    setEditingId(null);
    setEditText("");
  }

  function requestDelete(id: string) {
    cancelEdit();
    setConfirmDeleteId(id);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  async function confirmDelete(id: string) {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setDeleting(false);
      setError(CONFIG_ERROR_MESSAGE);
      return;
    }
    const { error } = await supabase.from("memos").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      setError("메모를 삭제하지 못했어요.");
      return;
    }
    setMemos((prev) => prev.filter((m) => m.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div
      className="min-h-screen bg-white text-[#37352F]"
      style={{ fontFamily: FONT_SANS }}
    >
      {/* 이 페이지엔 헤더가 없어서 로그인 위젯이 기댈 flex 흐름이 없다 — 여기만 예전처럼
          fixed 오버레이로 띄운다(다른 페이지는 각자 헤더 안에 inline으로 들어감). */}
      <AuthWidget />
      <div className="max-w-[720px] mx-auto px-4 md:px-24 py-12">
        <h1 className="text-[32px] font-bold leading-[1.3] text-[#37352F] mb-6">
          메모장
        </h1>

        {/* 입력창 */}
        <div className="mb-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="오늘 있었던 일을 적어보세요..."
            aria-label="새 메모 입력"
            className="w-full min-h-[80px] p-4 rounded-[6px] border border-[#E9E9E7] text-[16px] leading-[1.5] text-[#37352F] placeholder:text-[#9B9A97] transition-colors duration-100 outline-none focus:border-[#2383E2] focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2"
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newText.trim() || adding}
              aria-label="메모 추가"
              className="px-4 py-2 rounded-[6px] text-[14px] font-medium text-white bg-[#2383E2] transition-colors duration-100 hover:bg-[#1a6dc4] disabled:opacity-50 disabled:cursor-not-allowed focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2"
            >
              {adding ? "추가하는 중..." : "추가"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-[#E03E3E] mb-4" role="alert">
            {error}
          </p>
        )}

        {/* 목록 */}
        {loading ? (
          <p className="text-[13px] text-[#787774] text-center py-12">
            불러오는 중...
          </p>
        ) : memos.length === 0 ? (
          <div className="text-center text-[#787774] py-12">
            <p>아직 메모가 없어요.</p>
            <p>위 입력창에 첫 메모를 남겨보세요.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {memos.map((memo) => {
              const isEditing = editingId === memo.id;
              const isConfirmingDelete = confirmDeleteId === memo.id;
              return (
                <li
                  key={memo.id}
                  className="rounded-[6px] border border-[#E9E9E7] p-4 transition-colors duration-100 hover:bg-[#F7F6F3]"
                >
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        aria-label="메모 내용 수정"
                        autoFocus
                        className="w-full min-h-[80px] p-4 rounded-[6px] border border-[#E9E9E7] text-[16px] leading-[1.5] text-[#37352F] transition-colors duration-100 outline-none focus:border-[#2383E2] focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2"
                      />
                      <div className="flex justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          aria-label="수정 취소"
                          className="text-[14px] font-medium text-[#787774] transition-colors duration-100 hover:text-[#37352F] focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2 rounded-[6px] px-1"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(memo.id)}
                          disabled={!editText.trim() || savingEdit}
                          aria-label="수정 저장"
                          className="px-4 py-2 rounded-[6px] text-[14px] font-medium text-white bg-[#2383E2] transition-colors duration-100 hover:bg-[#1a6dc4] disabled:opacity-50 disabled:cursor-not-allowed focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2"
                        >
                          {savingEdit ? "저장하는 중..." : "저장"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[16px] leading-[1.5] text-[#37352F] whitespace-pre-wrap break-words">
                        {memo.text}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[13px] text-[#787774]">
                          {formatTimestamp(memo.created_at)}
                        </span>
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] text-[#787774]">
                              삭제할까요?
                            </span>
                            <button
                              type="button"
                              onClick={cancelDelete}
                              aria-label="삭제 취소"
                              className="text-[14px] font-medium text-[#787774] transition-colors duration-100 hover:text-[#37352F] focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2 rounded-[6px] px-1"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDelete(memo.id)}
                              disabled={deleting}
                              aria-label="삭제 확정"
                              className="text-[14px] font-medium text-[#E03E3E] transition-colors duration-100 hover:text-[#c22f2f] disabled:opacity-50 focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2 rounded-[6px] px-1"
                            >
                              {deleting ? "삭제하는 중..." : "삭제"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startEdit(memo)}
                              aria-label="메모 수정"
                              className="text-[14px] font-medium text-[#787774] transition-colors duration-100 hover:text-[#37352F] focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2 rounded-[6px] px-1"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(memo.id)}
                              aria-label="메모 삭제"
                              className="text-[14px] font-medium text-[#E03E3E] transition-colors duration-100 hover:text-[#c22f2f] focus:outline focus:outline-2 focus:outline-[#2383E2] focus:outline-offset-2 rounded-[6px] px-1"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
