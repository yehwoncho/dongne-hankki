import Link from "next/link";
import { getRegions, getMeta } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase-client";
import AuthWidget from "@/components/AuthWidget";
import RecommendationSection from "@/components/RecommendationSection";

// F1① 시·도 선택 — "색인/장부(ledger)" 리디자인.
// 이 파일에만 적용되는 팔레트라 CSS 변수로 스코프한다(다른 페이지/컴포넌트는 여전히
// tailwind.config.ts의 Stitch 토큰 그대로). 포인트 컬러(--index-red)는 요청대로 딱
// 4곳(마스트헤드 로고, "어디서 드시나요?"의 "?", 장부 행 호버 탭, AuthWidget palette="index")
// 에서만 쓴다 — 다른 곳은 ink/muted-ink/ledger만 사용.
const PALETTE_VARS = {
  "--paper": "#FAFAF7",
  "--ink": "#1C1B1A",
  "--index-red": "#C81E3A",
  "--ledger": "#DDD9D2",
  "--muted-ink": "#6B6862",
} as React.CSSProperties;

const SERIF = '"Noto Serif KR", serif';

// "지금 인기 맛집 TOP 5" — public.get_popular_places RPC(SECURITY DEFINER)로 saved_places를
// 전체 집계한다. RLS는 그대로 두고(본인 행만 select 가능) 이 함수만 우회해 "가게 정보 +
// 담긴 횟수"만 반환하고 user_id는 절대 내보내지 않는다. 비로그인 방문자도 봐야 해서 anon
// role에도 EXECUTE 권한이 열려 있다(SQL Editor에서 직접 실행한 마이그레이션).
interface PopularPlace {
  place_id: string;
  place_name: string;
  category_name: string | null;
  address: string | null;
  x: number | null;
  y: number | null;
  save_count: number;
}

async function getPopularPlaces(): Promise<PopularPlace[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return []; // 설정 오류(환경변수 누락) — 섹션은 빈 상태 안내로 대체
  const { data, error } = await supabase.rpc("get_popular_places", { result_limit: 5 });
  if (error || !data) return [];
  return data as PopularPlace[];
}

export default async function HomePage() {
  const regions = getRegions();
  const meta = await getMeta();
  const popularPlaces = await getPopularPlaces();

  return (
    <div style={PALETTE_VARS} className="flex-1 flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* 한글을 지원하는 세리프 — 이 페이지 전용, layout.tsx/tailwind.config.ts는 안 건드리고
          페이지 자체에서 <link>를 렌더(Next App Router가 <head>로 자동 호이스트). */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700;900&display=swap"
      />

      {/* 유틸리티 바 — 로고 없이 내주변/로그인만. 마스트헤드는 아래 별도 섹션에서 화면을
          압도하는 크기로 보여준다(요청: "동네한끼"·"어디서 드시나요?" 둘 다 크게). */}
      <header className="w-full top-0 sticky bg-[var(--paper)] border-b border-[var(--ledger)] z-50">
        <div className="flex justify-end items-center px-4 sm:px-6 lg:px-8 py-3 max-w-screen-xl mx-auto gap-2">
          <Link
            href="/nearby"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--ledger)] text-sm font-label font-medium text-[var(--muted-ink)] hover:text-[var(--ink)] hover:bg-[var(--ledger)]/30 transition-colors touch-target"
          >
            <span className="material-symbols-outlined text-[18px]">near_me</span>
            내 주변
          </Link>
          <AuthWidget variant="inline" palette="index" />
        </div>
      </header>

      {/* 마스트헤드 — "동네한끼"를 화면을 압도하는 세리프 로고로. 포인트 컬러 허용 용도. */}
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-16">
        <h1
          className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-[var(--index-red)] leading-[0.95] break-keep"
          style={{ fontFamily: SERIF }}
        >
          동네한끼
        </h1>
        <p className="mt-3 text-sm md:text-base text-[var(--muted-ink)] font-body break-keep">
          광고도 순위도 없이, 그 지역 식당 전체 목록
        </p>
      </div>

      {/* 히어로 */}
      <main className="flex-grow w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-10 pt-6">
          <p className="text-xs tracking-[0.2em] uppercase text-[var(--muted-ink)] font-label mb-3">
            지역 선택
          </p>
          <h2
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--ink)] mb-4 leading-[1.05] break-keep"
            style={{ fontFamily: SERIF }}
          >
            어디서 드시나요<span className="text-[var(--index-red)]">?</span>
          </h2>
          <p className="text-[var(--muted-ink)] text-base md:text-lg max-w-md font-body break-keep">
            원하시는 지역을 선택해 주세요. 해당 지역의 모든 식당 정보를 가감 없이 보여드립니다.
          </p>
        </div>

        {/* 지역 장부 — 카드 그리드 대신 얇은 선으로만 구분되는 리스트. 넓은 화면에선
            멀티컬럼(전화번호부처럼 위→아래로 채우고 다음 칸으로 넘어감)으로 Step 2의
            넓은 폭을 "장부"답게 쓴다. */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-x-8 pb-12">
          {regions.map((region) => (
            <Link
              key={region.slug}
              href={`/${region.slug}`}
              className="group flex items-center justify-between gap-4 py-4 pl-3 -ml-3 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors break-inside-avoid"
            >
              <span className="font-bold text-[var(--ink)] text-lg font-body">{region.name}</span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="tabular-nums text-sm text-[var(--muted-ink)] font-label">
                  {region.count.toLocaleString("ko-KR")}곳
                </span>
                <span className="material-symbols-outlined text-[18px] text-[var(--muted-ink)] group-hover:text-[var(--ink)] transition-colors">
                  chevron_right
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* 인기 랭킹 — 지역 리스트와 같은 장부 행 패턴(얇은 --ledger 구분선, hover 시에만
          --index-red 탭). 새로운 붉은색 사용처를 늘리지 않는다 — 위 마스트헤드 주석의
          "--index-red는 정확히 4곳" 규칙을 그대로 지킨다. */}
      <section className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 border-t border-[var(--ledger)] pt-10">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--muted-ink)] font-label mb-3">
          인기 랭킹
        </p>
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--ink)] mb-5 leading-[1.1] break-keep"
          style={{ fontFamily: SERIF }}
        >
          지금 인기 맛집 TOP 5
        </h2>

        {popularPlaces.length === 0 ? (
          <p className="text-sm text-[var(--muted-ink)] font-body py-6">아직 담긴 가게가 없어요.</p>
        ) : (
          <ul>
            {popularPlaces.map((place, i) => (
              <li key={place.place_id}>
                <a
                  href={`https://place.map.kakao.com/${place.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-4 py-4 pl-3 -ml-3 border-b border-[var(--ledger)] border-l-[3px] border-l-transparent hover:border-l-[var(--index-red)] transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="tabular-nums text-sm text-[var(--muted-ink)] font-label flex-shrink-0 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-bold text-[var(--ink)] text-base font-body truncate min-w-0">
                      {place.place_name}
                    </span>
                    {place.category_name && (
                      <span className="text-xs text-[var(--muted-ink)] font-label flex-shrink-0">
                        {place.category_name}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="tabular-nums text-sm text-[var(--muted-ink)] font-label">
                      {place.save_count.toLocaleString("ko-KR")}번 담김
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-[var(--muted-ink)] group-hover:text-[var(--ink)] transition-colors">
                      open_in_new
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 맞춤 추천 — 로그인 사용자에게만. 클라이언트 컴포넌트(useAuth 필요)라 별도 분리했다. */}
      <RecommendationSection />

      {/* Footer */}
      <footer className="w-full mt-auto bg-[var(--paper)] border-t border-[var(--ledger)]">
        <div className="flex flex-col gap-2 p-6 text-center max-w-screen-xl mx-auto">
          <p className="font-label text-xs leading-relaxed text-[var(--muted-ink)]">
            © 동네한끼. 공공데이터포털 기반 식당 전수 정보 (현재는 화면 검증용 목데이터).
          </p>
          <div className="text-[10px] text-[var(--muted-ink)] mt-2 font-label">
            데이터 출처: 문화공공데이터광장 · 기준일 {meta.snapshotDate}
          </div>
        </div>
      </footer>
    </div>
  );
}
