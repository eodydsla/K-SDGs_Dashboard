/**
 * 미래변화분석 공통 상수·타입.
 *
 * futures.ts 는 prisma 를 쓰는 server-only 모듈이라 클라이언트 컴포넌트가 import 할 수 없다.
 * 차트·데이터맵이 배지 색과 대응 수준을 알아야 하므로 그 부분만 여기로 뺐다.
 */

/** 축 — 시나리오를 묶는 최상위 구분 */
export const AXES = {
  population: { label: "인구", color: "#2a78d6" },
  climate: { label: "기후", color: "#eb6834" },
  carbon: { label: "탄소·에너지", color: "#1baf7a" },
  economy: { label: "경제·재정", color: "#eda100" },
  environment: { label: "환경·자원", color: "#e87ba4" },
} as const;
export type AxisKey = keyof typeof AXES;

export function axisOf(key: string) {
  return AXES[key as AxisKey] ?? { label: key, color: "#868E96" };
}

/** 출처 배지 — 이 숫자가 어디서 왔는지. 추정을 공식 전망처럼 보이게 두지 않는다. */
export const BADGES = {
  R: { label: "보고서 수록", color: "#256abf", desc: "정부·국제기구 공식 문서에 그대로 실린 값. 가공하지 않았습니다." },
  S: { label: "통계 산출", color: "#167f5a", desc: "공식 통계 원자료로 직접 계산한 값. 계산식이 공개되어 있습니다." },
  E: { label: "모델 추정", color: "#b57900", desc: "공식 전망이 없어 원단위·탄력성·외삽으로 추정한 값. 정부 공식 수치가 아닙니다." },
  B: { label: "국제비교·대리", color: "#6b4fc4", desc: "국제기구 값이거나 해외 사례를 벤치마크로 삼은 값." },
} as const;

export const CONFIDENCE = {
  high: { label: "상", desc: "원문 확인 완료 또는 단순 산술 계산." },
  mid: { label: "중", desc: "출처는 명확하나 2차 인용이거나 가정이 1~2개 들어갔습니다." },
  low: { label: "하", desc: "가정 의존도가 높은 추정. 방향성 참고용입니다." },
} as const;

/** 통계 ↔ 지표 대응 수준 */
export const MATCH = {
  exact: { label: "일치", color: "#2a78d6", desc: "이 통계로 지표를 그대로 산출할 수 있습니다." },
  near: { label: "근접", color: "#86b6ef", desc: "단위 환산·항목 합산 등 약간의 가공이 필요합니다." },
  context: { label: "관련", color: "#a8b2bc", desc: "지표를 만들 수는 없지만 맥락 파악·교차검증에 쓰입니다." },
} as const;


export interface SeriesPoint { y: number; v: number; b?: string; c?: string }
export interface Headline { label?: string; value?: string; delta?: string; badge?: string; confidence?: string }
export interface MethodDoc {
  definition?: string;
  sources?: { title: string; org?: string; year?: number; url?: string }[];
  steps?: string[];
  assumptions?: string[];
  /** 원본에서 한 문단(문자열)으로 들어오는 경우가 있어 배열이 아닐 수 있다 */
  limits?: string | string[];
  badge_reason?: string;
}

/** string | string[] 를 항상 배열로 — 원본 스키마가 필드마다 들쭉날쭉하다 */
export function toList(v: string | string[] | undefined | null): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v];
}
