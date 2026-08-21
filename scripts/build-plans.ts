/**
 * 중ㆍ장기 행정계획 목록 → sheets/plans.csv
 *
 * 입력: {PLANS_DIR}/output/행정계획_200_목록.csv  (200행: 본번 198 + 가지번호 2)
 * 출력: sheets/plans.csv
 *
 * 실행: npx tsx scripts/build-plans.ts
 *
 * 원문 PDF(약 1GB, 149건)는 public/plans/ 에 그대로 두고 정적으로 내려받게 한다.
 * 이 스크립트는 **파일이 실제로 있는지 확인**해 has_doc / doc_size / doc_file(웹 경로)을 채운다.
 * 목록에만 있고 파일이 없으면 내려받기 버튼을 띄우지 않는다 ("있는 것만" 받게 한다).
 */
import fs from "node:fs";
import path from "node:path";

const PLANS_DIR = process.env.PLANS_DIR ?? "/home/dyjin/work/행정계획";
const SRC = path.join(PLANS_DIR, "output", "행정계획_200_목록.csv");
const OUT = path.join(process.cwd(), "sheets", "plans.csv");
/** 원문 PDF 보관 위치 — 여기에 있는 파일만 내려받기를 연다 */
const DOC_DIR = path.join(process.cwd(), "public", "plans");

/** 따옴표를 처리하는 최소 CSV 파서 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(cell); cell = ""; continue; }
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const [header, ...body] = rows;
  return body
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const rows = parseCsv(fs.readFileSync(SRC, "utf8"));
console.log(`읽음: ${rows.length}행`);

const header = [
  "seq", "kind", "plan_name", "law", "article", "edition", "period", "cycle",
  "ministry", "confidence", "has_doc", "doc_file", "doc_size", "doc_note",
  "remark", "source_url", "note", "display", "order",
];

let found = 0;
let missing = 0;
const listedButMissing: string[] = [];

const out = rows.map((r, i) => {
  const docFile = r["문서파일"] ?? "";
  let size = "";
  let has = false;

  let webPath = "";
  if (docFile) {
    const base = path.basename(docFile);          // "docs/무엇.pdf" → "무엇.pdf"
    try {
      const st = fs.statSync(path.join(DOC_DIR, base));
      if (st.isFile() && st.size > 0) {
        has = true;
        size = String(st.size);
        webPath = `/plans/${base}`;
        found++;
      }
    } catch {
      // 목록에는 있는데 파일이 없는 경우 — 내려받기 버튼을 띄우면 안 되므로 기록해 둔다
      listedButMissing.push(`${r["연번"]} ${r["계획명"]}`);
    }
  }
  if (!has) missing++;

  return [
    r["연번"], r["구분"], r["계획명"], r["근거법률"], r["근거조문"], r["최신차수"],
    r["계획기간"], r["갱신주기"], r["소관부처"], r["신뢰도"],
    has ? "TRUE" : "FALSE", webPath, size, r["문서비고"],
    r["특이사항"], r["출처"], r["비고"], "TRUE", i + 1,
  ];
});

fs.writeFileSync(OUT, [header.join(","), ...out.map((r) => r.map(esc).join(","))].join("\n") + "\n", "utf8");

console.log(`\nsheets/plans.csv — ${out.length}행`);
console.log(`  · 원문 확보(파일 존재) ${found}건 / 미확보 ${missing}건`);
if (listedButMissing.length) {
  console.log(`  ⚠ 목록엔 있으나 파일이 없는 항목 ${listedButMissing.length}건 — 내려받기 비활성 처리:`);
  for (const x of listedButMissing.slice(0, 10)) console.log(`     - ${x}`);
}
if (out.length !== 200) { console.error(`\n✘ 200행이 아님 (${out.length}) — 원본 확인 필요`); process.exit(1); }
console.log("✔ 완료");
