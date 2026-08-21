/**
 * 시드 스크립트 — sheets/*.csv 를 읽어 SQLite에 넣는다.
 * 실행: npm run db:seed  (기존 데이터를 모두 지우고 다시 채움)
 */
import { PrismaClient } from "@prisma/client";
import Papa from "papaparse";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const SHEETS_DIR = path.join(process.cwd(), "sheets");

function readCsv<T extends Record<string, string>>(name: string): T[] {
  const file = path.join(SHEETS_DIR, `${name}.csv`);
  const text = fs.readFileSync(file, "utf-8");
  const parsed = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    console.warn(`⚠ ${name}.csv 파싱 경고:`, parsed.errors.slice(0, 3));
  }
  return parsed.data;
}

const str = (v?: string) => {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
};
const num = (v?: string) => {
  const s = (v ?? "").trim();
  if (s === "") return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const int = (v?: string) => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};
const bool = (v?: string, fallback = false) => {
  const s = (v ?? "").trim().toUpperCase();
  if (s === "TRUE" || s === "Y" || s === "1") return true;
  if (s === "FALSE" || s === "N" || s === "0") return false;
  return fallback;
};

async function main() {
  console.log("기존 데이터 삭제 중…");
  await prisma.auditLog.deleteMany();
  await prisma.indicatorStat.deleteMany();
  await prisma.statLink.deleteMany();
  await prisma.statSource.deleteMany();
  await prisma.scenarioIndicator.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.indicatorValue.deleteMany();
  await prisma.action.deleteMany();
  await prisma.indicator.deleteMany();
  await prisma.target.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.track.deleteMany();
  await prisma.config.deleteMany();

  // ── plans (중ㆍ장기 행정계획) ─────────────────────────
  // 지표 체계와 별개 축이라 상위 참조가 없다. 목록만 그대로 넣는다.
  const planRows = readCsv<Record<string, string>>("plans");
  for (const [i, r] of planRows.entries()) {
    const seq = (r.seq ?? "").trim();
    if (!seq) continue;
    await prisma.plan.create({
      data: {
        seq,
        kind: str(r.kind),
        name: (r.plan_name ?? seq).trim(),
        law: str(r.law),
        article: str(r.article),
        edition: str(r.edition),
        period: str(r.period),
        cycle: str(r.cycle),
        ministry: str(r.ministry),
        confidence: str(r.confidence),
        hasDoc: bool(r.has_doc),
        docFile: str(r.doc_file),
        docSize: int(r.doc_size),
        docNote: str(r.doc_note),
        remark: str(r.remark),
        sourceUrl: str(r.source_url),
        note: str(r.note),
        published: bool(r.display, true),
        order: int(r.order) ?? i + 1,
      },
    });
  }
  console.log(`plans: ${planRows.length}건 (원문 확보 ${planRows.filter((r) => bool(r.has_doc)).length}건)`);

  // ── scenarios (미래변화 시나리오) ────────────────────────
  const scenarioRows = readCsv<Record<string, string>>("scenarios");
  const scenarioIdByCode = new Map<string, string>();
  for (const [i, r] of scenarioRows.entries()) {
    const code = (r.code ?? "").trim();
    if (!code) continue;
    const sc = await prisma.scenario.create({
      data: {
        code,
        axis: (r.axis ?? "").trim() || "etc",
        title: (r.title ?? code).trim(),
        subtitle: str(r.subtitle),
        org: str(r.org),
        doc: str(r.doc),
        url: str(r.url),
        yearFrom: int(r.year_from),
        yearTo: int(r.year_to),
        variants: str(r.variants),
        headline: str(r.headline),
        definition: str(r.definition),
        assumptions: str(r.assumptions),
        uncertainty: str(r.uncertainty),
        published: bool(r.display, true),
        order: int(r.order) ?? i + 1,
      },
    });
    scenarioIdByCode.set(sc.code, sc.id);
  }
  console.log(`scenarios: ${scenarioRows.length}건`);

  const sIndRows = readCsv<Record<string, string>>("scenario_indicators");
  for (const [i, r] of sIndRows.entries()) {
    const scenarioId = scenarioIdByCode.get((r.scenario_code ?? "").trim());
    if (!scenarioId) {
      console.warn(`⚠ scenario_indicators ${r.code}: 시나리오 ${r.scenario_code} 없음 — 건너뜀`);
      continue;
    }
    await prisma.scenarioIndicator.create({
      data: {
        code: (r.code ?? "").trim(),
        scenarioId,
        name: (r.name ?? "").trim(),
        unit: str(r.unit),
        kind: (str(r.kind) ?? "direct") === "indirect" ? "indirect" : "direct",
        sdgPrimary: int(r.sdg_primary),
        sdgSecondary: str(r.sdg_secondary),
        direction: str(r.direction),
        strength: str(r.strength),
        badge: str(r.badge),
        confidence: str(r.confidence),
        headline: str(r.headline),
        seriesName: str(r.series_name),
        series: str(r.series),
        seriesAlt: str(r.series_alt),
        method: str(r.method),
        order: int(r.order) ?? i + 1,
      },
    });
  }
  console.log(`scenario_indicators: ${sIndRows.length}건`);

  // ── stats (연관 통계 카탈로그) ────────────────────────────
  const statRows = readCsv<Record<string, string>>("stats");
  const statIdByCode = new Map<string, string>();
  for (const [i, r] of statRows.entries()) {
    const code = (r.code ?? "").trim();
    if (!code) continue;
    const st = await prisma.statSource.create({
      data: {
        code,
        name: (r.name ?? code).trim(),
        org: str(r.org),
        portal: str(r.portal),
        freq: str(r.freq),
        goals: str(r.goals),
        targets: str(r.targets),
        note: str(r.note),
        url: str(r.url),
        published: bool(r.display, true),
        order: int(r.order) ?? i + 1,
      },
    });
    statIdByCode.set(st.code, st.id);
  }
  console.log(`stats: ${statRows.length}건`);

  const linkRows = readCsv<Record<string, string>>("stat_links");
  let linked = 0;
  for (const r of linkRows) {
    const statId = statIdByCode.get((r.stat_code ?? "").trim());
    const indicatorCode = (r.indicator_code ?? "").trim();
    if (!statId || !indicatorCode) continue;
    const exists = await prisma.scenarioIndicator.findUnique({ where: { code: indicatorCode } });
    if (!exists) {
      console.warn(`⚠ stat_links ${r.stat_code}→${indicatorCode}: 지표 없음 — 건너뜀`);
      continue;
    }
    await prisma.statLink.create({
      data: { statId, indicatorCode, match: (str(r.match) ?? "context") },
    });
    linked++;
  }
  console.log(`stat_links: ${linked}건`);

  // ── stat_catalog (직접 정리한 연관통계 메타) ───────────────
  // 앞의 stats(전망 출처 카탈로그)와 같은 StatSource 표를 쓴다. code 앞글자로 구분된다(ST/K).
  const catRows = readCsv<Record<string, string>>("stat_catalog");
  for (const [i, r] of catRows.entries()) {
    const code = (r.code ?? "").trim();
    if (!code) continue;
    const st = await prisma.statSource.create({
      data: {
        code,
        name: (r.name ?? code).trim(),
        org: str(r.org),
        portal: str(r.portal),
        freq: str(r.freq),
        domain: str(r.domain),
        goals: str(r.goals),
        keywords: str(r.keywords),
        note: str(r.note),
        url: str(r.url),
        orgUrl: str(r.org_url),
        source: "카탈로그",
        published: bool(r.display, true),
        order: 1000 + (int(r.order) ?? i + 1),
      },
    });
    statIdByCode.set(st.code, st.id);
  }
  console.log(`stat_catalog: ${catRows.length}건`);

  // ── config ──────────────────────────────────────────────
  const configRows = readCsv<{ key: string; value: string }>("config");
  for (const r of configRows) {
    if (!str(r.key)) continue;
    await prisma.config.create({ data: { key: r.key.trim(), value: r.value ?? "" } });
  }
  console.log(`config: ${configRows.length}건`);

  // ── tracks ──────────────────────────────────────────────
  const trackRows = readCsv<Record<string, string>>("tracks");
  const trackIdByCode = new Map<string, string>();
  for (const [i, r] of trackRows.entries()) {
    const t = await prisma.track.create({
      data: {
        code: r.track_id.trim(),
        name: r.track_name.trim(),
        description: str(r.track_desc),
        color: str(r.color),
        icon: str(r.icon),
        order: int(r.order) ?? i + 1,
        published: bool(r.display, true),
      },
    });
    trackIdByCode.set(t.code, t.id);
  }
  console.log(`tracks: ${trackRows.length}건`);

  // ── goals ───────────────────────────────────────────────
  const goalRows = readCsv<Record<string, string>>("goals");
  const goalIdByCode = new Map<string, string>();
  for (const [i, r] of goalRows.entries()) {
    const trackId = trackIdByCode.get((r.track_id ?? "").trim());
    if (!trackId) {
      console.warn(`⚠ goals ${r.goal_id}: 영역 ${r.track_id} 없음 — 건너뜀`);
      continue;
    }
    const g = await prisma.goal.create({
      data: {
        code: r.goal_id.trim(),
        trackId,
        no: (r.goal_no ?? "").trim(),
        name: r.goal_name.trim(),
        description: str(r.goal_desc),
        color: str(r.color),
        icon: str(r.icon),
        order: int(r.order) ?? i + 1,
      },
    });
    goalIdByCode.set(g.code, g.id);
  }
  console.log(`goals: ${goalRows.length}건`);

  // ── targets ─────────────────────────────────────────────
  const targetRows = readCsv<Record<string, string>>("targets");
  const targetIdByCode = new Map<string, string>();
  for (const [i, r] of targetRows.entries()) {
    const goalId = goalIdByCode.get(r.goal_id.trim());
    if (!goalId) {
      console.warn(`⚠ targets ${r.target_id}: 목표 ${r.goal_id} 없음 — 건너뜀`);
      continue;
    }
    const t = await prisma.target.create({
      data: {
        code: r.target_id.trim(),
        goalId,
        name: r.target_name.trim(),
        description: str(r.target_desc),
        order: int(r.order) ?? i + 1,
      },
    });
    targetIdByCode.set(t.code, t.id);
  }
  console.log(`targets: ${targetRows.length}건`);

  // ── indicators ──────────────────────────────────────────
  const indicatorRows = readCsv<Record<string, string>>("indicators");
  const indicatorIdByCode = new Map<string, string>();
  for (const [i, r] of indicatorRows.entries()) {
    const targetId = targetIdByCode.get(r.target_id.trim());
    if (!targetId) {
      console.warn(`⚠ indicators ${r.indicator_id}: 세부목표 ${r.target_id} 없음 — 건너뜀`);
      continue;
    }
    const ind = await prisma.indicator.create({
      data: {
        code: r.indicator_id.trim(),
        targetId,
        name: r.indicator_name.trim(),
        definition: str(r.definition),
        method: str(r.method),
        unit: str(r.unit),
        direction: (str(r.direction) ?? "up").toLowerCase() === "down" ? "down" : "up",
        baselineYear: int(r.baseline_year),
        baselineValue: num(r.baseline_value),
        targetYear: int(r.target_year),
        targetValue: num(r.target_value),
        longYear: int(r.long_year),
        longValue: num(r.long_value),
        targetLabel: str(r.target_label),
        longLabel: str(r.long_label),
        kind: str(r.kind),
        sourcePage: int(r.source_page),
        source: str(r.source),
        sourceUrl: str(r.source_url),
        updateCycle: str(r.update_cycle),
        custodian: str(r.custodian),
        statusOverride: str(r.status_override),
        isHeadline: bool(r.is_headline),
        published: bool(r.display, true),
        note: str(r.note),
        order: i + 1,
      },
    });
    indicatorIdByCode.set(ind.code, ind.id);
  }
  console.log(`indicators: ${indicatorRows.length}건`);

  // ── values ──────────────────────────────────────────────
  const valueRows = readCsv<Record<string, string>>("values");
  let valueCount = 0;
  for (const r of valueRows) {
    const indicatorId = indicatorIdByCode.get(r.indicator_id.trim());
    const year = int(r.year);
    const value = num(r.value);
    if (!indicatorId || year === null || value === null) {
      console.warn(`⚠ values ${r.indicator_id}/${r.year}: 유효하지 않음 — 건너뜀`);
      continue;
    }
    await prisma.indicatorValue.create({
      data: {
        indicatorId,
        year,
        value,
        region: str(r.region) ?? "전국",
        note: str(r.note),
      },
    });
    valueCount++;
  }
  console.log(`values: ${valueCount}건`);

  // ── stat_pages (지표누리에서 존재를 확인한 실제 통계 페이지) ──
  // 여기 담긴 주소는 클릭하면 그래프·통계표가 있는 실제 화면이 열린다.
  // 연결에 쓰이는 것만 넣는다 — 쓰지 않는 1천여 건까지 DB에 쌓을 이유가 없다.
  const pageRows = readCsv<Record<string, string>>("stat_pages");
  const linkRows2 = readCsv<Record<string, string>>("indicator_pages");
  const usedPages = new Set(linkRows2.map((r) => (r.page_code ?? "").trim()));
  let pageCount = 0;
  for (const [i, r] of pageRows.entries()) {
    const code = (r.code ?? "").trim();
    if (!code || !usedPages.has(code)) continue;
    const st = await prisma.statSource.create({
      data: {
        code,
        name: (r.name ?? code).trim(),
        org: str(r.source),
        portal: str(r.portal),
        source: str(r.source),
        goals: str(r.goal),
        url: str(r.url),
        orgUrl: "https://www.index.go.kr",
        published: true,
        order: 2000 + i,
      },
    });
    statIdByCode.set(st.code, st.id);
    pageCount++;
  }
  console.log(`stat_pages: ${pageCount}건 (e-나라지표 — 존재 확인된 통계 페이지)`);

  for (const [i, r] of linkRows2.entries()) {
    const indicatorId = indicatorIdByCode.get((r.indicator_id ?? "").trim());
    const statId = statIdByCode.get((r.page_code ?? "").trim());
    if (!indicatorId || !statId) continue;
    await prisma.indicatorStat.create({
      data: {
        indicatorId,
        statId,
        match: str(r.match) ?? "context",
        hits: null,
        auto: true,
        // 실제로 열리는 페이지를 먼저 보여준다
        order: -1000 + i,
      },
    });
  }
  console.log(`indicator_pages: ${linkRows2.length}건`);

  // ── KOSIS 통계표 직접 연결 ──────────────────────────────
  // 통계표 트리 API에서 얻은 실제 orgId·tblId 다. 검색 결과가 아니라 통계표 화면이 열린다.
  // 선택된 링크는 전부 HTTP로 열어 정상 응답을 확인했다.
  const kPages = readCsv<Record<string, string>>("kosis_pages");
  for (const [i, r] of kPages.entries()) {
    const code = (r.code ?? "").trim();
    if (!code) continue;
    const st = await prisma.statSource.create({
      data: {
        code,
        name: (r.name ?? code).trim(),
        org: str(r.org) ?? "KOSIS",
        portal: "KOSIS",
        source: "KOSIS 통계표",
        note: str(r.path),
        url: str(r.url),
        orgUrl: "https://kosis.kr",
        published: true,
        order: 3000 + i,
      },
    });
    statIdByCode.set(st.code, st.id);
  }
  console.log(`kosis_pages: ${kPages.length}건 (실제 통계표)`);

  const kLinks = readCsv<Record<string, string>>("indicator_kosis");
  let kCount = 0;
  for (const [i, r] of kLinks.entries()) {
    const indicatorId = indicatorIdByCode.get((r.indicator_id ?? "").trim());
    const statId = statIdByCode.get((r.page_code ?? "").trim());
    if (!indicatorId || !statId) continue;
    await prisma.indicatorStat.create({
      data: {
        indicatorId, statId,
        match: str(r.match) ?? "context",
        auto: true,
        // 통계표 화면이 바로 열리므로 가장 앞에 보여준다
        order: -2000 + i,
      },
    });
    kCount++;
  }
  console.log(`indicator_kosis: ${kCount}건`);

  // ── indicator_stats (지표 ↔ 통계) ─────────────────────────
  const isRows = readCsv<Record<string, string>>("indicator_stats");
  let isCount = 0;
  for (const [i, r] of isRows.entries()) {
    const indicatorId = indicatorIdByCode.get((r.indicator_id ?? "").trim());
    const statId = statIdByCode.get((r.stat_code ?? "").trim());
    if (!indicatorId || !statId) continue;
    await prisma.indicatorStat.create({
      data: {
        indicatorId,
        statId,
        match: str(r.match) ?? "context",
        hits: str(r.hits),
        auto: bool(r.auto, true),
        order: int(r.order) ?? i + 1,
      },
    });
    isCount++;
  }
  console.log(`indicator_stats: ${isCount}건`);

  // ── actions ─────────────────────────────────────────────
  const actionRows = readCsv<Record<string, string>>("actions");
  for (const [i, r] of actionRows.entries()) {
    await prisma.action.create({
      data: {
        code: r.action_id.trim(),
        goalId: goalIdByCode.get((r.goal_id ?? "").trim()) ?? null,
        targetId: targetIdByCode.get((r.target_id ?? "").trim()) ?? null,
        title: r.title.trim(),
        summary: str(r.summary),
        status: str(r.status) ?? "추진중",
        dueYear: int(r.due_year),
        responsible: str(r.responsible),
        lastUpdate: str(r.last_update),
        links: str(r.links),
        order: i + 1,
      },
    });
  }
  console.log(`actions: ${actionRows.length}건`);

  await prisma.auditLog.create({
    data: {
      actor: "시스템",
      action: "import",
      entity: "Seed",
      label: "초기 시드 데이터 주입",
      detail: JSON.stringify({
        tracks: trackRows.length,
        goals: goalRows.length,
        targets: targetRows.length,
        indicators: indicatorRows.length,
        values: valueCount,
        actions: actionRows.length,
      }),
    },
  });

  console.log("✔ 시드 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
