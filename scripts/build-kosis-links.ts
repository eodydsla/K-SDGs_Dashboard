/**
 * K-SDGs 지표 → KOSIS 통계표 직접 연결
 *
 * 입력: data/kosis-tables.json  (KOSIS 통계표 트리를 직접 훑어 얻은 orgId·tblId 목록)
 *       sheets/{indicators,targets,goals}.csv
 * 출력: sheets/kosis_pages.csv, sheets/indicator_kosis.csv
 *
 * 실행: npx tsx scripts/build-kosis-links.ts
 *
 * ── 왜 트리를 훑었나 ────────────────────────────────────────
 * KOSIS 검색 페이지는 결과를 JS로 그려서 HTML만 받아서는 통계표 번호를 알 수 없다.
 * 통계표 트리 API(/statisticsList/selectTreeData.do)는 orgId·tblId 를 그대로 주므로
 * 그걸 훑어 실제 번호를 얻었다. 그래서 링크가 검색 결과가 아니라 통계표 자체로 간다.
 *   https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B040A3&conn_path=I2
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SHEETS = path.join(ROOT, "sheets");

interface Table { orgId: string; tblId: string; name: string; path: string; org: string }
const ALL: Table[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "kosis-tables.json"), "utf8"));
/**
 * (파일) 유형 통계표는 첨부파일 배포용이라 statHtml 화면이 열리지 않고 오류가 난다.
 * 실제로 열어 확인한 결과라, 아예 후보에서 뺀다.
 */
const TABLES: Table[] = ALL.filter(
  (t) => !/^\(파일\)/.test(t.name) && !/FILE/i.test(t.tblId),
);

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
  console.log(`  ${name.padEnd(18)} ${String(rows.length).padStart(5)}행`);
};

// 어느 통계표 이름에나 나오는 말은 변별력이 없다
const STOP = new Set((
  "비율 지표 관련 대비 인구 국가 수준 정도 여부 건수 현황 등의 위한 따른 대한 이상 이하 " +
  "추이 전국 시도 시군구 행정구역 조사 통계 연간 월별 연도 전체 기타 구분 총괄 상황 " +
  "규모 상태 결과 내용 사업 실적 지역 남녀 성별 연령 계획 이용 관리"
).split(" "));

const norm = (s: string) => s.replace(/[^가-힣A-Za-z0-9]/gu, " ");
const toks = (s: string) =>
  new Set(norm(s).split(/\s+/).filter((t) => t.length >= 2 && !STOP.has(t)));

/** 지표 쪽 낱말이 통계표 이름에 얼마나 담겼는지 — 재현율 중심 */
function score(indName: string, tbl: Table): number {
  const ta = toks(indName);
  if (!ta.size) return 0;
  const hay = norm(`${tbl.name} ${tbl.path}`);
  let w = 0, n = 0;
  for (const t of ta) {
    if (hay.includes(t)) { w += Math.pow(t.length, 1.6); n++; }
  }
  if (!n) return 0;
  const total = [...ta].reduce((s, t) => s + Math.pow(t.length, 1.6), 0);
  // 이름 자체에 들어 있으면 가산 (경로에만 걸린 것보다 신뢰)
  const inName = [...ta].filter((t) => norm(tbl.name).includes(t)).length;
  return (w / total) * 100 + inName * 6 + (n >= 2 ? 8 : 0);
}

const goals = Object.fromEntries(readCsv("goals").map((g) => [g.goal_id, Number(g.goal_no)]));
const targets = Object.fromEntries(readCsv("targets").map((t) => [t.target_id, t]));
const inds = readCsv("indicators");

console.log(`KOSIS 통계표 ${TABLES.length.toLocaleString()}건과 대조합니다.`);
console.log("생성:");

const links: unknown[][] = [];
const usedTbl = new Map<string, Table>();
const nohit: string[] = [];

for (const ind of inds) {
  const t = targets[ind.target_id];
  void (t ? goals[t.goal_id] : undefined);

  const scored: { s: number; tb: Table }[] = [];
  for (const tb of TABLES) {
    const s = score(ind.indicator_name, tb);
    if (s >= 55) scored.push({ s, tb });
  }
  scored.sort((a, b) => b.s - a.s);

  // 같은 통계 계열이 수십 개씩 나오므로 이름 앞부분이 겹치면 하나만 남긴다
  const picked: { s: number; tb: Table }[] = [];
  for (const c of scored) {
    const head = c.tb.name.slice(0, 8);
    if (picked.some((p) => p.tb.name.slice(0, 8) === head)) continue;
    picked.push(c);
    if (picked.length >= 4) break;
  }

  if (!picked.length) { nohit.push(`${ind.indicator_id} ${ind.indicator_name}`); continue; }

  picked.forEach((c, i) => {
    const code = `KOSIS-${c.tb.orgId}-${c.tb.tblId}`;
    usedTbl.set(code, c.tb);
    links.push([
      ind.indicator_id, code, c.tb.name,
      `https://kosis.kr/statHtml/statHtml.do?orgId=${c.tb.orgId}&tblId=${c.tb.tblId}&conn_path=I2`,
      c.s >= 105 ? "exact" : c.s >= 80 ? "near" : "context",
      Math.round(c.s), i + 1,
    ]);
  });
}

write("kosis_pages", ["code", "name", "org_id", "tbl_id", "org", "path", "url"],
  [...usedTbl.entries()].map(([code, tb]) => [
    code, tb.name, tb.orgId, tb.tblId, tb.org, tb.path,
    `https://kosis.kr/statHtml/statHtml.do?orgId=${tb.orgId}&tblId=${tb.tblId}&conn_path=I2`,
  ]));
write("indicator_kosis", ["indicator_id", "page_code", "page_name", "url", "match", "score", "order"], links);

const covered = new Set(links.map((r) => String(r[0])));
console.log("\n검증:");
console.log(`  지표 ${inds.length}개 중 ${covered.size}개에 KOSIS 통계표 연결 (${nohit.length}개 미연결)`);
console.log(`  연결 ${links.length}건 · 통계표 ${usedTbl.size}종`);

fs.writeFileSync(path.join(ROOT, "scripts", "build-kosis-links.report.md"),
  `# 지표 → KOSIS 통계표 연결\n\n` +
  `KOSIS 통계표 트리 API에서 얻은 실제 orgId·tblId로 연결했습니다. 검색 결과가 아니라 통계표 화면이 열립니다.\n\n` +
  `- 대조한 통계표 ${TABLES.length.toLocaleString()}건\n` +
  `- 지표 ${inds.length}개 중 **${covered.size}개** 연결 · ${links.length}건\n\n` +
  `## 연결되지 않은 지표 (${nohit.length})\n\n${nohit.map((x) => `- ${x}`).join("\n")}\n`,
  "utf8");
console.log("  보고서 → scripts/build-kosis-links.report.md");
