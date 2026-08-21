/**
 * K-SDGs 지표 ↔ 연관 통계 연결표 만들기
 *
 * 입력: data/stat-catalog.ts (직접 정리한 통계 메타 98종)
 *       sheets/indicators.csv · targets.csv · goals.csv (현행 236개 지표 체계)
 * 출력: sheets/stat_catalog.csv, sheets/indicator_stats.csv
 *       scripts/build-indicator-stats.report.md
 *
 * 실행: npx tsx scripts/build-indicator-stats.ts
 *
 * ── 연결 규칙 ────────────────────────────────────────────────
 * 지표명·세부목표명·정의를 통계의 keywords 와 대조해 점수를 낸다.
 *   · 같은 목표(goal)에 속한 통계면 가산 — 엉뚱한 분야로 튀는 것을 막는다
 *   · 키워드가 길수록(구체적일수록) 높은 점수
 * 점수에 따라 일치/근접/관련로 나누고, **전부 auto=TRUE 로 표시**한다.
 * 자동 연결은 추정이지 검수 결과가 아니다. 화면에서도 그렇게 보여야 한다.
 */
import fs from "node:fs";
import path from "node:path";
import { CATALOG, statUrl, orgSite } from "../data/stat-catalog";

const SHEETS = path.join(process.cwd(), "sheets");
const REPORT = path.join(process.cwd(), "scripts", "build-indicator-stats.report.md");

function readCsv(name: string): Record<string, string>[] {
  const text = fs.readFileSync(path.join(SHEETS, `${name}.csv`), "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
      continue;
    }
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

function esc(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function write(name: string, header: string[], rows: unknown[][]) {
  fs.writeFileSync(path.join(SHEETS, `${name}.csv`),
    [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n", "utf8");
  console.log(`  ${name.padEnd(18)} ${String(rows.length).padStart(4)}행`);
}

// ── 현행 지표 체계 읽기 ──────────────────────────────────────
const goals = readCsv("goals");
const targets = readCsv("targets");
const indicators = readCsv("indicators");

const goalNoById = new Map(goals.map((g) => [g.goal_id, Number(g.goal_no)]));
const targetById = new Map(targets.map((t) => [t.target_id, t]));

console.log("생성:");

// ── 통계 카탈로그 ────────────────────────────────────────────
write("stat_catalog",
  ["code", "name", "org", "portal", "freq", "domain", "goals", "keywords", "note", "url", "org_url", "display", "order"],
  CATALOG.map((c, i) => [
    c.code, c.name, c.org, c.portal, c.freq, c.domain,
    c.goals.join(","), c.keywords.join(","), c.note ?? "",
    statUrl(c),          // 통계 조회 주소 — 비는 일이 없다
    orgSite(c.org) ?? "", // 작성기관 누리집
    "TRUE", i + 1,
  ]),
);

// ── 지표 ↔ 통계 연결 ─────────────────────────────────────────
/** 정규화 — 띄어쓰기·가운뎃점 차이로 매칭이 어긋나지 않게 */
const norm = (s: string) => s.replace(/[\s·ㆍ・,()]/gu, "").toLowerCase();

interface Hit { stat: typeof CATALOG[number]; score: number; words: string[] }

const links: unknown[][] = [];
const noMatch: string[] = [];
const dist = { exact: 0, near: 0, context: 0 };

for (const ind of indicators) {
  const t = targetById.get(ind.target_id);
  const goalNo = t ? goalNoById.get(t.goal_id) ?? 0 : 0;
  // 지표명이 가장 중요하고, 세부목표·정의는 보조 근거
  const primary = norm(ind.indicator_name ?? "");
  const context = norm(`${t?.target_name ?? ""} ${ind.definition ?? ""} ${ind.unit ?? ""}`);

  const hits: Hit[] = [];
  for (const stat of CATALOG) {
    let score = 0;
    const words: string[] = [];
    for (const kw of stat.keywords) {
      const k = norm(kw);
      if (!k) continue;
      // 구체적인(긴) 키워드일수록 신뢰도가 높다
      const weight = k.length >= 5 ? 4 : k.length >= 3 ? 3 : 2;
      if (primary.includes(k)) { score += weight * 2; words.push(kw); }
      else if (context.includes(k)) { score += weight; words.push(kw); }
    }
    if (!score) continue;
    // 같은 목표를 다루는 통계면 가산 — 분야가 다른 우연한 단어 일치를 눌러준다
    if (goalNo && stat.goals.includes(goalNo)) score += 5;
    hits.push({ stat, score, words: [...new Set(words)] });
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 5).filter((h) => h.score >= 6);

  if (!top.length) {
    noMatch.push(`${ind.indicator_id} ${ind.indicator_name}`);
    continue;
  }

  top.forEach((h, i) => {
    const match = h.score >= 16 ? "exact" : h.score >= 10 ? "near" : "context";
    dist[match]++;
    links.push([ind.indicator_id, h.stat.code, match, h.words.slice(0, 5).join(","), "TRUE", i + 1]);
  });
}

write("indicator_stats", ["indicator_id", "stat_code", "match", "hits", "auto", "order"], links);

// ── 보고 ─────────────────────────────────────────────────────
const covered = new Set(links.map((r) => String(r[0])));
const usedStats = new Set(links.map((r) => String(r[1])));

console.log("\n검증:");
console.log(`  지표 ${indicators.length}개 중 ${covered.size}개에 연결 (${noMatch.length}개 미연결)`);
console.log(`  연결 ${links.length}건 — 일치 ${dist.exact} · 근접 ${dist.near} · 관련 ${dist.context}`);
console.log(`  카탈로그 ${CATALOG.length}종 중 ${usedStats.size}종 사용`);

fs.writeFileSync(REPORT,
  `# 지표 ↔ 연관통계 자동 연결 결과\n\n` +
  `**모든 연결은 규칙으로 자동 도출한 것이며 검수 전입니다.** 화면에도 「자동 연결」로 표시됩니다.\n\n` +
  `- 지표 ${indicators.length}개 중 **${covered.size}개** 연결 · **${noMatch.length}개 미연결**\n` +
  `- 연결 ${links.length}건 (일치 ${dist.exact} · 근접 ${dist.near} · 관련 ${dist.context})\n` +
  `- 통계 카탈로그 ${CATALOG.length}종 중 ${usedStats.size}종 사용, 미사용 ${CATALOG.length - usedStats.size}종\n\n` +
  `## 연결되지 않은 지표 (${noMatch.length})\n\n` +
  `키워드가 걸리지 않은 지표입니다. 관리자에서 직접 연결하거나 카탈로그에 통계를 추가하세요.\n\n` +
  noMatch.map((x) => `- ${x}`).join("\n") + "\n\n" +
  `## 사용되지 않은 통계\n\n` +
  CATALOG.filter((c) => !usedStats.has(c.code)).map((c) => `- ${c.code} ${c.name}`).join("\n") + "\n",
  "utf8");
console.log(`\n보고서 → scripts/build-indicator-stats.report.md`);
