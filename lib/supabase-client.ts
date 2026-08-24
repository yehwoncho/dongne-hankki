// 브라우저에서 쓰는 Supabase 클라이언트 싱글턴.
// lib/auth.ts와 앞으로 추가될 클라이언트 기능(예: 담기)이 이 인스턴스를 공유한다.
// app/memo/page.tsx는 이전 작업에서 "파일 하나로 완결"하라는 요구사항이 있어
// 여기에 맞추지 않고 자체적으로 createClient를 갖고 있다 — 의도적으로 그대로 둔다.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
