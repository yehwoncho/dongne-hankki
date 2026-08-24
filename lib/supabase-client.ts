// 브라우저에서 쓰는 Supabase 클라이언트 싱글턴.
// lib/auth.ts와 앞으로 추가될 클라이언트 기능(예: 담기)이 이 인스턴스를 공유한다.
// app/memo/page.tsx는 이전 작업에서 "파일 하나로 완결"하라는 요구사항이 있어
// 여기에 맞추지 않고 자체적으로 createClient를 갖고 있다 — 의도적으로 그대로 둔다.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let warnedMissingConfig = false;

/** 첫 호출 시점에만 클라이언트를 만들고, 이후엔 캐시된 인스턴스를 재사용한다.
 * 모듈 로드 시점에 곧바로 createClient()를 부르면(예전 방식) 배포 환경에
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 빠져 있을 때 이 파일을
 * import하기만 해도 "supabaseUrl is required" 에러로 빌드/렌더링 자체가 죽는다.
 * 값이 없으면 클라이언트를 만들지 않고 콘솔에 한 번만 에러를 남긴 뒤 null을 반환해,
 * 호출부가 화면에서 안내하고 나머지 페이지는 정상적으로 렌더링되게 한다. */
export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (!warnedMissingConfig) {
      console.error(
        "[supabase-client] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. Supabase 기능이 비활성화됩니다."
      );
      warnedMissingConfig = true;
    }
    return null;
  }

  client = createClient(url, anonKey);
  return client;
}
