/**
 * 미래변화 시나리오 · 연관 통계 → sheets/*.csv
 *
 * 입력: data/scenarios-payload.json
 *   (「K-SDGs 사회변화 시나리오 영향 대시보드」 아티팩트의 payload 를 그대로 옮긴 것)
 * 출력: sheets/{scenarios,scenario_indicators,stats,stat_links}.csv
 *
 * 실행: npx tsx scripts/build-scenarios.ts
 *
 * 중첩 구조(series·method·assumptions)는 JSON 문자열 한 칸에 담는다.
 * SQLite + Prisma 조합에서 Json 타입을 못 쓰기도 하고, CSV로 왕복시키려면
 * 어차피 한 칸에 들어가야 한다. 화면에서 JSON.parse 해서 쓴다.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "data", "scenarios-payload.json");
const OUT = path.join(process.cwd(), "sheets");

interface Payload {
  reference: {
    statistics: {
      catalog: {
        id: string; name: string; org?: string; portal?: string; freq?: string;
        goals?: number[]; targets?: string[]; note?: string; url?: string;
        links?: { ind: string; match: string }[];
      }[];
    };
  };
  scenarios: {
    id: string; axis: string; title: string; subtitle?: string; org?: string;
    doc?: string; url?: string; period?: number[]; variants?: string[];
    headline?: unknown; definition?: string; assumptions?: unknown; uncertainty?: string;
    indicators: {
      id: string; name: string; unit?: string; type?: string;
      sdg_primary?: number; sdg_secondary?: number[]; direction?: string; strength?: string;
      badge?: string; confidence?: string; headline?: string;
      series_name?: string; series?: unknown; series_alt?: unknown; method?: unknown;
    }[];
  }[];
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeSheet(name: string, header: string[], rows: unknown[][]) {
  fs.writeFileSync(
    path.join(OUT, `${name}.csv`),
    [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n",
    "utf8",
  );
  console.log(`  ${name.padEnd(21)} ${String(rows.length).padStart(4)}행`);
}
const j = (v: unknown) => (v === undefined || v === null ? "" : JSON.stringify(v));

const p: Payload = JSON.parse(fs.readFileSync(SRC, "utf8"));
fs.mkdirSync(OUT, { recursive: true });

console.log("생성:");

writeSheet("scenarios",
  ["code", "axis", "title", "subtitle", "org", "doc", "url", "year_from", "year_to",
   "variants", "headline", "definition", "assumptions", "uncertainty", "display", "order"],
  p.scenarios.map((s, i) => [
    s.id, s.axis, s.title, s.subtitle, s.org, s.doc, s.url,
    s.period?.[0] ?? "", s.period?.[1] ?? "",
    (s.variants ?? []).join(";"),
    j(s.headline), s.definition, j(s.assumptions), s.uncertainty,
    "TRUE", i + 1,
  ]),
);

const indRows: unknown[][] = [];
for (const s of p.scenarios) {
  s.indicators.forEach((x, i) => {
    indRows.push([
      x.id, s.id, x.name, x.unit, x.type ?? "direct",
      x.sdg_primary ?? "", (x.sdg_secondary ?? []).join(","),
      x.direction, x.strength, x.badge, x.confidence, x.headline,
      x.series_name, j(x.series), j(x.series_alt), j(x.method), i + 1,
    ]);
  });
}
writeSheet("scenario_indicators",
  ["code", "scenario_code", "name", "unit", "kind", "sdg_primary", "sdg_secondary",
   "direction", "strength", "badge", "confidence", "headline",
   "series_name", "series", "series_alt", "method", "order"],
  indRows);

const cat = p.reference.statistics.catalog;
writeSheet("stats",
  ["code", "name", "org", "portal", "freq", "goals", "targets", "note", "url", "display", "order"],
  cat.map((c, i) => [
    c.id, c.name, c.org, c.portal, c.freq,
    (c.goals ?? []).join(","), (c.targets ?? []).join(","),
    c.note, c.url, "TRUE", i + 1,
  ]),
);

const linkRows: unknown[][] = [];
for (const c of cat) for (const l of c.links ?? []) linkRows.push([c.id, l.ind, l.match]);
writeSheet("stat_links", ["stat_code", "indicator_code", "match"], linkRows);

// ── 검증 ────────────────────────────────────────────────────
const indCodes = new Set(indRows.map((r) => String(r[0])));
const dangling = linkRows.filter((r) => !indCodes.has(String(r[1])));
console.log("\n검증:");
console.log(`  시나리오 ${p.scenarios.length} · 시나리오지표 ${indRows.length} · 통계 ${cat.length} · 연결 ${linkRows.length}`);
if (dangling.length) {
  console.error(`  ✘ 존재하지 않는 지표를 가리키는 연결 ${dangling.length}건: ${dangling.slice(0, 5).map((d) => d.join("→")).join(", ")}`);
  process.exit(1);
}
console.log("  ✔ 연결이 모두 실재하는 지표를 가리킴");
