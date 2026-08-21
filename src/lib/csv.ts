import { prisma } from "@/lib/prisma";

/**
 * CSV 컬럼의 한글 이름.
 * 화면에는 한글로 보여주고 실제 CSV 헤더는 영문을 그대로 쓴다 —
 * 엑셀에서 열 이름이 바뀌면 가져오기가 깨지기 때문에 헤더 자체는 손대지 않는다.
 */
export const CSV_FIELD_LABELS: Record<string, string> = {
  // 공통
  order: "정렬순서", display: "공개여부", note: "비고", color: "색상", icon: "아이콘",

  // 부문 · 목표 · 세부목표
  track_id: "부문 번호", track_name: "부문명", track_desc: "부문 설명",
  goal_id: "목표 번호", goal_no: "목표 표시번호", goal_name: "목표명", goal_desc: "목표 설명",
  target_id: "세부목표 번호", target_name: "세부목표명", target_desc: "세부목표 설명",

  // 지표
  indicator_id: "지표 번호", indicator_name: "지표명",
  definition: "정의", method: "산출식", unit: "단위", direction: "방향(up/down)",
  baseline_year: "기준연도", baseline_value: "기준값",
  target_year: "중간목표 연도", target_value: "중간목표 값",
  long_year: "장기목표 연도", long_value: "장기목표 값",
  target_label: "중간목표 원문", long_label: "장기목표 원문",
  kind: "지표유형", source_page: "근거 쪽수",
  source: "출처", source_url: "출처 URL", update_cycle: "갱신주기", custodian: "담당",
  status_override: "상태 수동지정", is_headline: "대표지표",

  // 실적값
  year: "연도", value: "값", region: "지역",

  // 이행과제
  action_id: "과제 번호", title: "과제명", summary: "요약", status: "상태",
  due_year: "목표연도", responsible: "담당", last_update: "최종수정일", links: "링크",

  // 행정계획
  seq: "연번", plan_name: "계획명", law: "근거법률", article: "근거조문",
  edition: "최신차수", period: "계획기간", cycle: "갱신주기", ministry: "소관부처",
  confidence: "신뢰도", has_doc: "원문 확보", doc_file: "원문 경로", doc_size: "파일 크기",
  doc_note: "원문 비고", remark: "특이사항",

  // 시나리오 · 연관통계
  axis: "축", subtitle: "부제", doc: "근거문서", year_from: "시작연도", year_to: "종료연도",
  variants: "변형", headline: "대표수치", assumptions: "가정",
  uncertainty: "불확실성", scenario_code: "시나리오 번호", sdg_primary: "주 연결목표",
  sdg_secondary: "부 연결목표", strength: "영향 세기", badge: "출처배지",
  series_name: "시계열명", series: "시계열", series_alt: "대안 시계열",
  portal: "제공 포털", freq: "통계 갱신주기",
  stat_code: "통계 번호", match: "대응 수준",

  // 사이트 설정
  key: "설정 키",
};

/** 한글명이 없으면 영문 그대로 돌려준다 */
export function fieldLabel(name: string): string {
  return CSV_FIELD_LABELS[name] ?? name;
}

export const CSV_TYPES = ["tracks", "goals", "targets", "indicators", "values", "actions", "plans", "scenarios", "scenario_indicators", "stats", "stat_links", "config"] as const;
export type CsvType = (typeof CSV_TYPES)[number];

export const CSV_HEADERS: Record<CsvType, string[]> = {
  tracks: ["track_id", "track_name", "track_desc", "color", "icon", "order", "display"],
  plans: [
    "seq", "kind", "plan_name", "law", "article", "edition", "period", "cycle",
    "ministry", "confidence", "has_doc", "doc_file", "doc_size", "doc_note",
    "remark", "source_url", "note", "display", "order",
  ],
  scenarios: [
    "code", "axis", "title", "subtitle", "org", "doc", "url", "year_from", "year_to",
    "variants", "headline", "definition", "assumptions", "uncertainty", "display", "order",
  ],
  scenario_indicators: [
    "code", "scenario_code", "name", "unit", "kind", "sdg_primary", "sdg_secondary",
    "direction", "strength", "badge", "confidence", "headline",
    "series_name", "series", "series_alt", "method", "order",
  ],
  stats: ["code", "name", "org", "portal", "freq", "goals", "targets", "note", "url", "display", "order"],
  stat_links: ["stat_code", "indicator_code", "match"],
  goals: ["goal_id", "track_id", "goal_no", "goal_name", "goal_desc", "color", "icon", "order", "display"],
  targets: ["target_id", "goal_id", "target_name", "target_desc", "order", "display"],
  indicators: [
    "indicator_id",
    "target_id",
    "indicator_name",
    "definition",
    "method",
    "unit",
    "direction",
    "baseline_year",
    "baseline_value",
    "target_year",
    "target_value",
    "long_year",
    "long_value",
    "target_label",
    "long_label",
    "kind",
    "source_page",
    "source",
    "source_url",
    "update_cycle",
    "custodian",
    "status_override",
    "is_headline",
    "display",
    "note",
  ],
  values: ["indicator_id", "year", "value", "region", "note"],
  actions: [
    "action_id",
    "goal_id",
    "target_id",
    "title",
    "summary",
    "status",
    "due_year",
    "responsible",
    "last_update",
    "links",
  ],
  config: ["key", "value"],
};

export const CSV_LABELS: Record<CsvType, string> = {
  tracks: "모니터링 영역",
  goals: "목표",
  targets: "세부목표",
  indicators: "지표",
  plans: "행정계획",
  scenarios: "시나리오",
  scenario_indicators: "시나리오 지표",
  stats: "연관 통계",
  stat_links: "통계–지표 연결",
  values: "실적값",
  actions: "이행과제",
  config: "사이트 설정",
};

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
}

const b = (v: boolean) => (v ? "TRUE" : "FALSE");

/**
 * CSV 내려받기 — 업로드 포맷과 동일해서 그대로 되돌릴 수 있다.
 * trackCode 를 주면 해당 모니터링 영역에 속한 행만 내보낸다(공개 화면의 영역별 내려받기용).
 */
export async function exportCsv(type: CsvType, trackCode?: string): Promise<string> {
  const h = CSV_HEADERS[type];
  const byTrack = trackCode ? { track: { code: trackCode } } : {};

  switch (type) {
    case "tracks": {
      const rows = await prisma.track.findMany({
        where: trackCode ? { code: trackCode } : {},
        orderBy: [{ order: "asc" }, { code: "asc" }],
      });
      return toCsv(h, rows.map((t) => [t.code, t.name, t.description, t.color, t.icon, t.order, b(t.published)]));
    }
    case "goals": {
      const rows = await prisma.goal.findMany({
        where: byTrack,
        orderBy: [{ order: "asc" }, { code: "asc" }],
        include: { track: true },
      });
      return toCsv(
        h,
        rows.map((g) => [g.code, g.track.code, g.no, g.name, g.description, g.color, g.icon, g.order, b(g.published)]),
      );
    }
    case "targets": {
      const rows = await prisma.target.findMany({
        where: trackCode ? { goal: byTrack } : {},
        orderBy: [{ order: "asc" }, { code: "asc" }],
        include: { goal: true },
      });
      return toCsv(h, rows.map((t) => [t.code, t.goal.code, t.name, t.description, t.order, b(t.published)]));
    }
    case "scenarios": {
      const rows = await prisma.scenario.findMany({ orderBy: { order: "asc" } });
      return toCsv(h, rows.map((x) => [
        x.code, x.axis, x.title, x.subtitle, x.org, x.doc, x.url, x.yearFrom, x.yearTo,
        x.variants, x.headline, x.definition, x.assumptions, x.uncertainty, b(x.published), x.order,
      ]));
    }
    case "scenario_indicators": {
      const rows = await prisma.scenarioIndicator.findMany({
        orderBy: [{ scenarioId: "asc" }, { order: "asc" }],
        include: { scenario: true },
      });
      return toCsv(h, rows.map((x) => [
        x.code, x.scenario.code, x.name, x.unit, x.kind, x.sdgPrimary, x.sdgSecondary,
        x.direction, x.strength, x.badge, x.confidence, x.headline,
        x.seriesName, x.series, x.seriesAlt, x.method, x.order,
      ]));
    }
    case "stats": {
      const rows = await prisma.statSource.findMany({ orderBy: { order: "asc" } });
      return toCsv(h, rows.map((x) => [
        x.code, x.name, x.org, x.portal, x.freq, x.goals, x.targets, x.note, x.url, b(x.published), x.order,
      ]));
    }
    case "stat_links": {
      const rows = await prisma.statLink.findMany({ include: { stat: true } });
      return toCsv(h, rows.map((x) => [x.stat.code, x.indicatorCode, x.match]));
    }
    case "plans": {
      const rows = await prisma.plan.findMany({ orderBy: { order: "asc" } });
      return toCsv(
        h,
        rows.map((p) => [
          p.seq, p.kind, p.name, p.law, p.article, p.edition, p.period, p.cycle,
          p.ministry, p.confidence, b(p.hasDoc), p.docFile, p.docSize, p.docNote,
          p.remark, p.sourceUrl, p.note, b(p.published), p.order,
        ]),
      );
    }
    case "indicators": {
      const rows = await prisma.indicator.findMany({
        where: trackCode ? { target: { goal: byTrack } } : {},
        orderBy: [{ order: "asc" }, { code: "asc" }],
        include: { target: true },
      });
      return toCsv(
        h,
        rows.map((i) => [
          i.code,
          i.target.code,
          i.name,
          i.definition,
          i.method,
          i.unit,
          i.direction,
          i.baselineYear,
          i.baselineValue,
          i.targetYear,
          i.targetValue,
          i.longYear,
          i.longValue,
          i.targetLabel,
          i.longLabel,
          i.kind,
          i.sourcePage,
          i.source,
          i.sourceUrl,
          i.updateCycle,
          i.custodian,
          i.statusOverride,
          b(i.isHeadline),
          b(i.published),
          i.note,
        ]),
      );
    }
    case "values": {
      const rows = await prisma.indicatorValue.findMany({
        where: trackCode ? { indicator: { target: { goal: byTrack } } } : {},
        orderBy: [{ indicatorId: "asc" }, { year: "asc" }],
        include: { indicator: true },
      });
      return toCsv(h, rows.map((v) => [v.indicator.code, v.year, v.value, v.region, v.note]));
    }
    case "actions": {
      const rows = await prisma.action.findMany({
        where: trackCode ? { goal: byTrack } : {},
        orderBy: [{ order: "asc" }, { code: "asc" }],
        include: { goal: true, target: true },
      });
      return toCsv(
        h,
        rows.map((a) => [
          a.code,
          a.goal?.code ?? "",
          a.target?.code ?? "",
          a.title,
          a.summary,
          a.status,
          a.dueYear,
          a.responsible,
          a.lastUpdate,
          a.links,
        ]),
      );
    }
    case "config": {
      const rows = await prisma.config.findMany({ orderBy: { key: "asc" } });
      return toCsv(h, rows.map((c) => [c.key, c.value]));
    }
  }
}
