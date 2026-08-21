/**
 * 상단 메인 내비 항목 정의 — 공개 헤더와 관리자 설정이 같은 목록을 본다.
 *
 * 아이콘은 클라이언트 컴포넌트(top-nav.tsx)에서 key로 붙인다.
 * 여기에 두면 서버 컴포넌트인 관리자 설정 화면이 lucide 아이콘까지 끌고 들어오게 되고,
 * 무엇보다 "메뉴 목록"과 "메뉴 생김새"는 따로 바뀌는 관심사다.
 */
export interface NavItemDef {
  key: string;
  href: string;
  label: string;
  exact?: boolean;
  mega?: boolean;
  /** 관리자 화면 설명 */
  desc: string;
}

export const NAV_ITEMS: NavItemDef[] = [
  { key: "home", href: "/", label: "통합 현황", exact: true, desc: "홈 — 히어로·17목표 그리드" },
  { key: "goals", href: "/goals", label: "K-SDGs", mega: true, desc: "17개 목표 메가메뉴" },
  { key: "futures", href: "/futures", label: "미래변화분석", desc: "시나리오별 K-SDGs 영향" },
  { key: "datamap", href: "/datamap", label: "데이터맵", desc: "지표↔통계 연결 지도" },
  { key: "plans", href: "/plans", label: "행정계획", desc: "중·장기 행정계획 목록·원문" },
  { key: "about", href: "/about", label: "센터 소개", desc: "센터·지속가능발전 개요" },
];

function parseKeys(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * `nav_hidden` 설정값(세미콜론 구분 key 목록)을 파싱한다.
 * 숨김은 메뉴에서 빼는 것일 뿐 라우트는 그대로 살아 있다 — 직접 주소를 치면 열린다.
 */
export function parseHiddenNav(raw: string | null | undefined): Set<string> {
  return new Set(parseKeys(raw));
}

/**
 * `nav_order`에 적힌 순서대로 정렬한다. 목록에 없는 key(설정 후에 추가된 메뉴)는 뒤에 원래 순서로 붙는다.
 * 그래서 새 메뉴를 코드에 추가해도 설정을 다시 저장할 때까지 조용히 사라지지 않는다.
 */
export function orderedNavItems(orderRaw: string | null | undefined): NavItemDef[] {
  const order = parseKeys(orderRaw);
  if (!order.length) return [...NAV_ITEMS];
  const rank = new Map(order.map((k, i) => [k, i]));
  return [...NAV_ITEMS].sort(
    (a, b) => (rank.get(a.key) ?? NAV_ITEMS.length + NAV_ITEMS.indexOf(a)) - (rank.get(b.key) ?? NAV_ITEMS.length + NAV_ITEMS.indexOf(b)),
  );
}

/** 공개 헤더가 실제로 그리는 목록 — 순서 적용 후 숨김 제거 */
export function visibleNavItems(hiddenRaw: string | null | undefined, orderRaw?: string | null): NavItemDef[] {
  const hidden = parseHiddenNav(hiddenRaw);
  return orderedNavItems(orderRaw).filter((i) => !hidden.has(i.key));
}

/**
 * `/`로 들어왔을 때 실제로 보여줄 메뉴. 설정 `nav_home`(메뉴 key)이 정하고, 비어 있으면 첫 메뉴다.
 *
 * 지정한 메뉴를 나중에 숨기면 그 설정은 무시하고 남아 있는 첫 메뉴로 떨어진다 —
 * 첫 화면이 없는 사이트는 있을 수 없기 때문. (전체 숨김은 저장 단계에서 막는다.)
 */
export function homeNavItem(
  hiddenRaw: string | null | undefined,
  orderRaw?: string | null,
  homeKey?: string | null,
): NavItemDef | null {
  const items = visibleNavItems(hiddenRaw, orderRaw);
  return items.find((i) => i.key === (homeKey ?? "").trim()) ?? items[0] ?? null;
}

/** 첫 화면이 통합 현황(`/`)이 아니면 보낼 주소, 맞으면 null */
export function homeRedirect(
  hiddenRaw: string | null | undefined,
  orderRaw?: string | null,
  homeKey?: string | null,
): string | null {
  const item = homeNavItem(hiddenRaw, orderRaw, homeKey);
  if (!item || item.href === "/") return null;
  return item.href;
}
