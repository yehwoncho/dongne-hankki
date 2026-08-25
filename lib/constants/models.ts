/**
 * Gemini 모델 ID를 한 곳에 모아둔다 — 여러 서버 모듈(lib/gemini-review-summary.ts,
 * lib/gemini-review-analysis.ts 등)이 이 상수를 공유해서, 모델을 바꿀 때 여기 한 곳만
 * 고치면 된다.
 *
 * GA(정식 출시) 모델만 쓴다 — "-preview"/"-image"/"-tts"/"-live" 등 접미사가 붙은 변형은
 * Preview 단계이거나 이미지/음성/실시간 전용이라 기본값에서 제외했다. 목록은
 * https://ai.google.dev/gemini-api/docs/models 에서 확인(확인일: 2026-08-25) —
 * 텍스트 생성용 최신 GA Flash 모델이 gemini-3.7-flash였다.
 */
export const GEMINI_FLASH_MODEL = "gemini-3.7-flash";
