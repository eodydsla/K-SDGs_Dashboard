/**
 * 목표별 아이덴티티 컬러.
 * 시트/관리자에서 색을 지정하지 않으면 팔레트에서 순서대로 자동 배정하므로
 * 목표를 몇 개 추가하든 색이 겹치거나 비어 보이지 않는다.
 */

export const GOAL_PALETTE = [
  "#E8590C", // 앰버
  "#0B7285", // 딥 틸
  "#2F9E44", // 포레스트
  "#5F3DC4", // 바이올렛
  "#0B5394", // 딥 블루
  "#B02A37", // 크림슨
  "#7048E8", // 인디고
  "#087F5B", // 에메랄드
  "#D6336C", // 마젠타
  "#A9761A", // 브론즈
];

export function goalColor(color: string | null | undefined, index: number): string {
  const c = (color ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : GOAL_PALETTE[index % GOAL_PALETTE.length];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
}

/** 서버 → 클라이언트로 그대로 넘길 수 있도록 전부 문자열(직렬화 가능)로만 구성 */
export interface Tones {
  /** 원색 */
  base: string;
  /** 아주 옅은 배경 */
  tint: string;
  /** 카드 보더 */
  border: string;
  /** 색 위에 얹는 진한 텍스트 */
  text: string;
  /** 그라디언트 끝 색 */
  deep: string;
  a08: string;
  a15: string;
  a30: string;
}

/** 색 하나에서 배경·보더·텍스트 톤을 파생 — 색 하나만 지정해도 조화롭게 보인다 */
export function tones(hex: string): Tones {
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsl(r, g, b);
  const a = (v: number) => `rgba(${r}, ${g}, ${b}, ${v})`;
  return {
    base: hex,
    tint: `hsl(${h.toFixed(0)} ${Math.min(s, 70).toFixed(0)}% 96.5%)`,
    border: `hsl(${h.toFixed(0)} ${Math.min(s, 60).toFixed(0)}% 87%)`,
    text: `hsl(${h.toFixed(0)} ${Math.min(s + 5, 75).toFixed(0)}% 30%)`,
    deep: `hsl(${h.toFixed(0)} ${Math.min(s + 8, 85).toFixed(0)}% 32%)`,
    a08: a(0.08),
    a15: a(0.15),
    a30: a(0.3),
  };
}

/**
 * 배경색 위에 올릴 글자색.
 * SDG 공식색에는 밝은 노랑·머스터드(#FCC30B 목표7, #DDA63A 목표2, #BF8B2E 목표12)가 있어
 * 흰 글씨를 얹으면 대비가 3:1 아래로 떨어진다. 임계값을 찍지 않고 실제 명암비를 계산해
 * 흰색·먹색 중 더 잘 읽히는 쪽을 고른다.
 */
const INK = "#16202A";

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 명암비 (1~21) */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function onColor(hex: string): "#FFFFFF" | typeof INK {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, INK) ? "#FFFFFF" : INK;
}

/**
 * 색 위에 작은 글자를 얹어야 할 때 쓸 배경·글자색 쌍.
 *
 * K-SDGs 공식색 중 목표 1(#EA1D2D)·5(#EF412A)는 중간 톤 적색이라
 * 흰 글씨든 먹 글씨든 명암비가 4.5:1에 못 미친다. 그런 색만 AA를 넘길 때까지
 * 명도를 낮춰 쓴다. **공식 심볼 이미지 자체는 절대 건드리지 않는다**
 * — 이 함수는 번호 칩·배지처럼 우리가 그리는 UI 요소에만 쓴다.
 */
export function readablePair(hex: string): { bg: string; fg: string } {
  const fg = onColor(hex);
  if (contrastRatio(hex, fg) >= 4.5) return { bg: hex, fg };

  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  for (let light = l; light >= 8; light -= 2) {
    const bg = hslToHex(h, s, light);
    if (contrastRatio(bg, "#FFFFFF") >= 4.5) return { bg, fg: "#FFFFFF" };
  }
  return { bg: hslToHex(h, s, 20), fg: "#FFFFFF" };
}

function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100;
  const L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/**
 * 목표 헤더처럼 색 위에 큰 글자를 얹는 배너용 그라디언트.
 *
 * 목표색을 그대로 깔면 문제가 두 가지 생긴다.
 * (1) 17색의 밝기가 제각각이라 어떤 목표는 흰 글씨가, 어떤 목표는 먹 글씨가 맞는데
 *     그라디언트 양 끝의 밝기가 달라 한쪽 끝에서 반드시 글자가 묻힌다.
 * (2) 목표 1·5처럼 중간 톤 적색은 어느 글자색으로도 4.5:1을 못 넘는다.
 * 그래서 배너는 항상 목표색을 어둡게 내린 두 단계로 깔고 흰 글씨로 통일한다.
 * 원색은 배지·막대 같은 작은 요소에서 그대로 쓴다.
 */
export function bannerGradient(hex: string): { from: string; to: string; fg: string } {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l0] = rgbToHsl(r, g, b);
  const sat = Math.min(s, 72);
  // 이미 충분히 어두운 목표색(예: 목표 17 #1A3668)을 밝히지 않도록 현재 명도에서 시작한다
  let from = hex;
  for (let l = Math.min(l0, 44); l >= 12; l -= 2) {
    from = hslToHex(h, sat, l);
    if (contrastRatio(from, "#FFFFFF") >= 5.5) break;
  }
  const [, , fromL] = rgbToHsl(...hexToRgb(from));
  return { from, to: hslToHex(h, sat, Math.max(12, fromL - 12)), fg: "#FFFFFF" };
}
