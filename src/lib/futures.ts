import "server-only";
import { prisma } from "@/lib/prisma";
import type { SeriesPoint, Headline, MethodDoc } from "@/lib/futures-meta";

// 상수·타입은 클라이언트도 써야 해서 futures-meta 에 있다. 여기서 그대로 다시 내보낸다.
export * from "@/lib/futures-meta";

/**
 * 미래변화분석 · 데이터맵의 읽기 계층.
 * 시나리오·시나리오지표·연관통계를 한 번에 조립해 화면에 넘긴다.
 * 중첩 데이터(series·method·assumptions)는 DB에 JSON 문자열로 있으므로 여기서 풀어준다.
 */

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface FutureIndicator {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  kind: string;
  sdgPrimary: number | null;
  sdgSecondary: number[];
  direction: string | null;
  strength: string | null;
  badge: string | null;
  confidence: string | null;
  headline: string | null;
  seriesName: string | null;
  series: SeriesPoint[];
  seriesAlt: { name: string; points: { y: number; v: number }[] }[];
  method: MethodDoc | null;
  scenarioCode: string;
  scenarioTitle: string;
  axis: string;
}

export interface FutureScenario {
  id: string;
  code: string;
  axis: string;
  title: string;
  subtitle: string | null;
  org: string | null;
  doc: string | null;
  url: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  variants: string[];
  headline: Headline | null;
  definition: string | null;
  assumptions: string[];
  uncertainty: string | null;
  indicators: FutureIndicator[];
}

export async function getScenarios(includeUnpublished = false): Promise<FutureScenario[]> {
  const rows = await prisma.scenario.findMany({
    where: includeUnpublished ? {} : { published: true },
    orderBy: { order: "asc" },
    include: { indicators: { orderBy: { order: "asc" } } },
  });

  return rows.map((s) => ({
    id: s.id,
    code: s.code,
    axis: s.axis,
    title: s.title,
    subtitle: s.subtitle,
    org: s.org,
    doc: s.doc,
    url: s.url,
    yearFrom: s.yearFrom,
    yearTo: s.yearTo,
    variants: (s.variants ?? "").split(";").map((x) => x.trim()).filter(Boolean),
    headline: parse<Headline | null>(s.headline, null),
    definition: s.definition,
    assumptions: parse<string[]>(s.assumptions, []),
    uncertainty: s.uncertainty,
    indicators: s.indicators.map((x) => ({
      id: x.id,
      code: x.code,
      name: x.name,
      unit: x.unit,
      kind: x.kind,
      sdgPrimary: x.sdgPrimary,
      sdgSecondary: (x.sdgSecondary ?? "").split(",").map((n) => Number(n.trim())).filter(Number.isFinite),
      direction: x.direction,
      strength: x.strength,
      badge: x.badge,
      confidence: x.confidence,
      headline: x.headline,
      seriesName: x.seriesName,
      series: parse<SeriesPoint[]>(x.series, []),
      seriesAlt: parse<{ name: string; points: { y: number; v: number }[] }[]>(x.seriesAlt, []),
      method: parse<MethodDoc | null>(x.method, null),
      scenarioCode: s.code,
      scenarioTitle: s.title,
      axis: s.axis,
    })),
  }));
}

export function findScenario(list: FutureScenario[], code: string) {
  return list.find((s) => s.code.toLowerCase() === code.toLowerCase()) ?? null;
}

export interface StatRow {
  id: string;
  code: string;
  name: string;
  org: string | null;
  portal: string | null;
  freq: string | null;
  goals: number[];
  targets: string[];
  note: string | null;
  url: string | null;
  links: { indicatorCode: string; match: string }[];
}

export async function getStats(includeUnpublished = false): Promise<StatRow[]> {
  const rows = await prisma.statSource.findMany({
    where: includeUnpublished ? {} : { published: true },
    orderBy: { order: "asc" },
    include: { links: true },
  });
  return rows.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    org: s.org,
    portal: s.portal,
    freq: s.freq,
    goals: (s.goals ?? "").split(",").map((n) => Number(n.trim())).filter(Number.isFinite),
    targets: (s.targets ?? "").split(",").map((x) => x.trim()).filter(Boolean),
    note: s.note,
    url: s.url,
    links: s.links.map((l) => ({ indicatorCode: l.indicatorCode, match: l.match })),
  }));
}

// ── 지표 중심 데이터맵 ────────────────────────────────────────
export interface MapStat {
  code: string; name: string; org: string | null; portal: string | null;
  freq: string | null; domain: string | null; url: string | null; orgUrl: string | null;
  /** 카탈로그(직접 정리) | 지표누리(SDG) | e-나라지표 */
  source: string | null;
  /** true = 클릭하면 그래프·통계표가 있는 실제 통계 화면이 바로 열린다 */
  direct: boolean;
  match: string; auto: boolean; hits: string[];
}
export interface MapIndicator {
  id: string; code: string; name: string; unit: string | null; kind: string | null;
  status: string; stats: MapStat[];
}
export interface MapTarget { code: string; name: string; indicators: MapIndicator[] }
export interface MapGoal {
  no: number; name: string; color: string; targets: MapTarget[];
  indicatorCount: number; linkedCount: number; statCount: number;
}

/**
 * 지표 중심 데이터맵 — 목표 → 세부목표 → 지표 → 연관통계 순으로 펼친 트리.
 * 「이 지표를 무엇으로 재나」의 답이다. 전망 출처 지도(/futures/sources)와 방향이 반대다.
 */
export async function getIndicatorStatMap(): Promise<MapGoal[]> {
  const goals = await prisma.goal.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { code: "asc" }],
    include: {
      targets: {
        where: { published: true },
        orderBy: [{ order: "asc" }, { code: "asc" }],
        include: {
          indicators: {
            where: { published: true },
            orderBy: [{ order: "asc" }, { code: "asc" }],
            include: {
              values: { orderBy: { year: "asc" } },
              stats: { orderBy: { order: "asc" }, include: { stat: true } },
            },
          },
        },
      },
    },
  });

  const { compute } = await import("@/lib/progress");
  const { goalColor } = await import("@/lib/colors");

  return goals.map((g, gi) => {
    const color = goalColor(g.color, gi);
    const targets: MapTarget[] = g.targets.map((t) => ({
      code: t.code,
      name: t.name,
      indicators: t.indicators.map((ind) => ({
        id: ind.id,
        code: ind.code,
        name: ind.name,
        unit: ind.unit,
        kind: ind.kind,
        status: compute(ind, ind.values.map((v) => ({ year: v.year, value: v.value, note: v.note }))).status,
        stats: ind.stats.map((s) => ({
          code: s.stat.code,
          name: s.stat.name,
          org: s.stat.org,
          portal: s.stat.portal,
          freq: s.stat.freq,
          domain: s.stat.domain,
          url: s.stat.url,
          orgUrl: s.stat.orgUrl,
          source: s.stat.source,
          // 지표누리에서 존재를 확인한 페이지만 "바로 열린다"고 표시한다
          direct: s.stat.code.startsWith("KOSIS-") || s.stat.code.startsWith("IDX"),
          match: s.match,
          auto: s.auto,
          hits: (s.hits ?? "").split(",").map((x) => x.trim()).filter(Boolean),
        })),
      })),
    }));

    const all = targets.flatMap((t) => t.indicators);
    return {
      no: Number(g.no),
      name: g.name,
      color,
      targets,
      indicatorCount: all.length,
      linkedCount: all.filter((i) => i.stats.length > 0).length,
      statCount: new Set(all.flatMap((i) => i.stats.map((s) => s.code))).size,
    };
  });
}
