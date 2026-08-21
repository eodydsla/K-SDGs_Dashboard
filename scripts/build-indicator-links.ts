/**
 * K-SDGs 지표 → 실제로 열리는 통계 페이지 연결
 *
 * 입력: data/index-sdg-indicators.json     (지표누리 SDG 지표 202개 — 직접 조회해 확보)
 *       data/index-national-indicators.json (e-나라지표 국가지표 936개 — 직접 조회해 확보)
 *       sheets/{indicators,targets,goals}.csv
 * 출력: sheets/stat_pages.csv, sheets/indicator_pages.csv
 *
 * 실행: npx tsx scripts/build-indicator-links.ts
 *
 * ── 왜 이렇게 하는가 ────────────────────────────────────────
 * 통계표 코드를 지어내면 죽은 링크가 되고, 검색 페이지로 보내면 "되는 둥 마는 둥"이 된다.
 * 그래서 지표누리(index.go.kr)의 지표 상세 주소를 **실제로 요청해 존재를 확인한 것만** 쓴다.
 *   SDG 지표   https://www.index.go.kr/unity/potal/indicator/IndexInfo.do?clasCd=15&idxCd=G0172
 *   국가지표   https://www.index.go.kr/unify/idx-info.do?idxCd=4201
 * 두 주소 모두 클릭하면 그래프·통계표가 있는 실제 통계 화면이 열린다.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SHEETS = path.join(ROOT, "sheets");

// 지표누리의 SDG 지표(clasCd=15)는 UN-SDGs 국제지표라 K-SDGs 체계와 다르다.
// 섞으면 "우리 지표를 재는 통계"가 아니라 "다른 나라 기준"을 가리키게 되므로 쓰지 않는다.
const natIdx: Record<string, { name: string }> =
  JSON.parse(fs.readFileSync(path.join(ROOT, "data", "index-national-indicators.json"), "utf8"));

function readCsv(name: string): Record<string, string>[] {
  const text = fs.readFileSync(path.join(SHEETS, `${name}.csv`), "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"') { q = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; continue; }
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const write = (name: string, header: string[], rows: unknown[][]) => {
  fs.writeFileSync(path.join(SHEETS, `${name}.csv`),
    [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n", "utf8");
  console.log(`  ${name.padEnd(18)} ${String(rows.length).padStart(4)}행`);
};

// ── 이름 유사도 ──────────────────────────────────────────────
// 흔한 말(비율·지표·현황…)은 어느 지표에나 있어 변별력이 없으므로 뺀다.
const STOP = new Set("비율 지표 관련 대비 인구 국가 수준 정도 여부 건수 현황 등의 위한 따른 대한 이상 이하 추이 및및".split(" "));
const toks = (s: string) =>
  new Set(
    s.replace(/[^가-힣A-Za-z0-9]/gu, " ").split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP.has(t)),
  );
/** 겹치는 낱말이 길수록(구체적일수록) 점수가 커진다 */
function sim(a: string, b: string): number {
  const ta = toks(a), tb = toks(b);
  if (!ta.size || !tb.size) return 0;
  let w = 0;
  for (const t of ta) if (tb.has(t)) w += Math.pow(t.length, 1.5);
  if (!w) return 0;
  const norm = (s: Set<string>) => [...s].reduce((n, t) => n + Math.pow(t.length, 1.5), 0);
  return (w * 2) / (norm(ta) + norm(tb)) * 100;
}

// ── 통계 페이지 카탈로그 ─────────────────────────────────────
const pages: unknown[][] = [];
for (const [code, v] of Object.entries(natIdx)) {
  pages.push([`IDXN-${code}`, v.name, "e-나라지표", "index.go.kr",
    `https://www.index.go.kr/unify/idx-info.do?idxCd=${code}`, ""]);
}
console.log("생성:");
write("stat_pages", ["code", "name", "source", "portal", "url", "goal"], pages);

// ── 지표 ↔ 통계 페이지 연결 ──────────────────────────────────
const goals = Object.fromEntries(readCsv("goals").map((g) => [g.goal_id, Number(g.goal_no)]));
const targets = Object.fromEntries(readCsv("targets").map((t) => [t.target_id, t]));
const inds = readCsv("indicators");

const links: unknown[][] = [];
const nohit: string[] = [];

for (const ind of inds) {
  const t = targets[ind.target_id];
  const _goalNo = t ? goals[t.goal_id] : undefined;
  void _goalNo;
  const text = `${ind.indicator_name} ${t?.target_name ?? ""}`;

  const cands: { code: string; name: string; url: string; score: number; src: string }[] = [];

  // e-나라지표 국가지표 — 이름만으로 판단하므로 문턱을 보수적으로 잡는다
  for (const [code, v] of Object.entries(natIdx)) {
    const s = Math.max(sim(ind.indicator_name, v.name), sim(text, v.name) * 0.85);
    if (s >= 26) cands.push({ code: `IDXN-${code}`, name: v.name, score: s, src: "nat",
      url: `https://www.index.go.kr/unify/idx-info.do?idxCd=${code}` });
  }

  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, 5);
  if (!top.length) { nohit.push(`${ind.indicator_id} ${ind.indicator_name}`); continue; }

  top.forEach((c, i) => {
    links.push([ind.indicator_id, c.code, c.name, c.url,
      c.score >= 58 ? "exact" : c.score >= 38 ? "near" : "context", Math.round(c.score), i + 1]);
  });
}

write("indicator_pages", ["indicator_id", "page_code", "page_name", "url", "match", "score", "order"], links);

const covered = new Set(links.map((r) => String(r[0])));
console.log("\n검증:");
console.log(`  지표 ${inds.length}개 중 ${covered.size}개에 실제 통계 페이지 연결 (${nohit.length}개 미연결)`);
console.log(`  연결 ${links.length}건 — 전부 e-나라지표 국가지표`);

fs.writeFileSync(path.join(ROOT, "scripts", "build-indicator-links.report.md"),
  `# 지표 → 실제 통계 페이지 연결\n\n` +
  `지표누리(index.go.kr) 주소를 직접 요청해 **존재를 확인한 페이지만** 연결했습니다.\n\n` +
  `- e-나라지표 국가지표 ${Object.keys(natIdx).length}개 확보 (직접 조회로 존재 확인)\n` +
  `- 지표 ${inds.length}개 중 **${covered.size}개** 연결, 총 ${links.length}건\n\n` +
  `## 연결되지 않은 지표 (${nohit.length})\n\n${nohit.map((x) => `- ${x}`).join("\n")}\n`,
  "utf8");
console.log("  보고서 → scripts/build-indicator-links.report.md");
