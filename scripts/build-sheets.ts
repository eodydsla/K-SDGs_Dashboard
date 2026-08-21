/**
 * 제4차 지속가능발전 기본계획 → sheets/*.csv 변환
 *
 * 입력: /home/dyjin/work/SDGs/work/ksdgs_4차/ksdgs.json  (17목표 / 119세부목표 / 236지표)
 * 출력: sheets/{tracks,goals,targets,indicators,values,actions,config}.csv (+ .tsv)
 *      scripts/build-sheets.report.md — 수기 검수가 필요한 항목 목록
 *
 * 실행: npx tsx scripts/build-sheets.ts
 *
 * 이 스크립트가 만드는 CSV는 sheets/README.md의 컬럼 규격과 동일하다.
 * 즉 관리자 화면(/admin/data)에서 그대로 다시 올릴 수 있다.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "/home/dyjin/work/SDGs/work/ksdgs_4차/ksdgs.json";
const OUT = path.join(process.cwd(), "sheets");
const REPORT = path.join(process.cwd(), "scripts", "build-sheets.report.md");

// ── 원본 타입 ────────────────────────────────────────────────
interface SrcGoal { goal: number; title: string; targets: number; indicators: number }
interface SrcTarget { id: string; goal: number; text: string; page: number; ministry: string[] }
interface SrcIndicator { no: string; target: string; name: string; values: string[]; page: number; method: string | null }
interface Src { goals: SrcGoal[]; targets: SrcTarget[]; indicators: SrcIndicator[]; verify: Record<string, unknown> }

// ── 부문(Track) — 제4차 기본계획 2부 목차 Ⅰ~Ⅳ ──────────────
// 출처: /home/dyjin/work/SDGs/work/ksdgs_4차/2부.txt 20~57행
// ※ 목표 11이 '환경'이 아니라 '포용사회'에 들어간다. UN 5P와 다른 지점이므로 짐작 금지.
const TRACKS = [
  { id: "inclusive",   name: "사람이 사람답게 살 수 있는 포용사회",   roman: "Ⅰ", desc: "빈곤·식량·건강·교육·성평등·주거 — 사람 중심의 포용 기반을 다집니다", color: "#EA1D2D", icon: "🤝", goals: [1, 2, 3, 4, 5, 11] },
  { id: "growth",      name: "혁신적 성장을 통한 국민의 삶의 질 향상", roman: "Ⅱ", desc: "좋은 일자리·산업 혁신·불평등 해소·지속가능한 생산과 소비를 추진합니다", color: "#8F1838", icon: "📈", goals: [8, 9, 10, 12] },
  { id: "environment", name: "미래 세대가 함께 누리는 깨끗한 환경",   roman: "Ⅲ", desc: "물·에너지·기후·해양·육상 생태계를 보전하고 회복합니다", color: "#48773C", icon: "🌏", goals: [6, 7, 13, 14, 15] },
  { id: "peace",       name: "지구촌 평화와 협력 강화",               roman: "Ⅳ", desc: "평화·정의·포용 제도를 세우고 국제 협력 기반을 강화합니다", color: "#00558A", icon: "🕊️", goals: [16, 17] },
];

// ── K-SDGs 공식 목표색 + 아이콘 ──────────────────────────────
// 지속가능발전포털의 공식 심볼(public/ksdgs/goal-NN.svg)에서 추출한 값이다.
// UN-SDGs 팔레트와 미세하게 다르므로(목표1: UN #E5243B / K-SDGs #EA1D2D) 섞어 쓰지 말 것.
const GOAL_COLOR: Record<number, string> = {
  1: "#EA1D2D", 2: "#D19F2A", 3: "#2D9A47", 4: "#C22033", 5: "#EF412A", 6: "#00ADD8",
  7: "#FDB714", 8: "#8F1838", 9: "#F36E24", 10: "#E01A83", 11: "#F99D25", 12: "#CD8B2A",
  13: "#48773C", 14: "#007DBB", 15: "#40AE49", 16: "#00558A", 17: "#1A3668",
};
// 공식 심볼이 없는 자리(메뉴 칩 등)에서 쓰는 보조 아이콘
const GOAL_ICON: Record<number, string> = {
  1: "🏠", 2: "🌾", 3: "❤️", 4: "📚", 5: "⚖️", 6: "💧", 7: "⚡", 8: "💼", 9: "🏭",
  10: "🫱", 11: "🏙️", 12: "♻️", 13: "🌡️", 14: "🌊", 15: "🌳", 16: "🕊️", 17: "🌐",
};

// ── 값 문자열 파싱 ───────────────────────────────────────────
// "2018: 16.7%"      → {year:2018, value:16.7,  unit:"%",  label:"16.7%"}
// "2030: 1.0% 이상"  → {year:2030, value:1.0,   unit:"%",  label:"1.0% 이상"}
// "2030: 지속 감소"  → {year:2030, value:null,  unit:"",   label:"지속 감소"}
interface Parsed { year: number; value: number | null; unit: string; label: string }

const YEAR_RE = /^\s*(\d{4})\s*[:：]\s*(.+?)\s*$/;
// 숫자 + 뒤따르는 단위. 콤마 천단위 허용.
const NUM_RE = /^\(?\s*(-?[\d,]+(?:\.\d+)?)\s*([^\s(]*)/;

function parseValue(raw: string): Parsed | null {
  const m = YEAR_RE.exec(raw);
  if (!m) return null;
  const year = Number(m[1]);
  const label = m[2].trim();
  // "2017년 대비 …" 는 기준연도를 가리키는 상대목표 서술이다.
  // 앞 숫자를 값으로 읽으면 온실가스 배출량이 "2017"이 되어버리므로 서술형으로 취급한다.
  if (/^\d{4}\s*년/u.test(label)) return { year, value: null, unit: "", label };
  const n = NUM_RE.exec(label);
  if (!n) return { year, value: null, unit: "", label };
  const value = Number(n[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return { year, value: null, unit: "", label };
  // 단위: 숫자 바로 뒤에 붙은 토큰에서 비교어("이상/이하/내외")를 걷어낸다
  const unit = (n[2] || "").replace(/(이상|이하|내외|수준|미만|초과)$/u, "").trim();
  return { year, value, unit, label };
}

// ── 지표명 정리 + 값 복구 ────────────────────────────────────
// 원본 PDF 파서가 지표표를 지표명 칸에 접어 넣은 경우가 63건 있다. 예:
//   "인구집단별 고용률 - 2019 ∙여성 51.6% … - 2030 ∙(여성) 62.0% …"   values=[]
// 이름에서 값 부분을 떼어내고, values가 비어 있으면 거기서 값을 복구한다.

/** " - " 로 나뉜 조각이 값처럼 보이는가 (연도로 시작) */
const CHUNK_YEAR = /^(\d{4})(?:\.\d+)?\s*년?\s*[:：]?\s*(.*)$/u;
/** 연도 없이 붙은 목표 서술인가. 예: "… - 지속 감소" */
const CHUNK_BARE_TARGET = /^(지속\s*(감소|확대|증가|유지)|안정적\s*유지|일정\s*비율\s*유지|기반\s*마련|수립)$/u;
/** 값이 아니라 "통계 없음" 류의 비고인가 */
const CHUNK_NOTE = /^(?:구축\s*)?(?:관련\s*)?(?:현재\s*|현\s*)?(?:통계\s*)?(?:미구축|없음|산출\s*필요|데이터\s*필요|최초\s*산출\s*필요|목표치\s*설정\s*불가.*|.*\s*필요)$|^(?:현재|현|최초)\s+.+$|^추후\s*보완$|^수치\s*없음.*$|^[가-힣]{1,6}\s*[:：]\s*.+$/u;

interface Cleaned { name: string; recovered: string[]; notes: string[] }

function cleanName(raw: string): Cleaned {
  const parts = raw.replace(/\s*-\s*-\s*/gu, " - ").split(/\s+-\s+/u).map((x) => x.trim()).filter(Boolean);
  const nameParts: string[] = [];
  const recovered: string[] = [];
  const notes: string[] = [];
  let hitData = false;

  for (const part of parts) {
    const y = CHUNK_YEAR.exec(part);
    if (y) {
      hitData = true;
      const year = y[1];
      const body = y[2].trim();
      if (body) {
        // 여러 계열(∙여성/∙장애인)은 하나의 숫자로 합칠 수 없으므로 서술형으로 남긴다
        const multi = body.includes("∙");
        recovered.push(`${year}: ${multi ? body.replace(/∙/gu, " ").replace(/\s+/gu, " ").trim() : body}`);
      }
      continue;
    }
    if (/^[\d,]+(?:\.\d+)?\s*\S*$/u.test(part) && nameParts.length) {
      // 연도가 떨어져 나가고 값만 남은 조각. 목표연도를 알 수 없으므로 비고로만 남긴다.
      hitData = true;
      notes.push(part);
      continue;
    }
    if (CHUNK_BARE_TARGET.test(part) && nameParts.length) {
      // 연도가 없으므로 기본 목표연도 두 곳에 같은 서술을 적용한다
      hitData = true;
      recovered.push(`2030: ${part}`, `2040: ${part}`);
      continue;
    }
    if (CHUNK_NOTE.test(part)) { hitData = true; notes.push(part); continue; }
    // 값 구간이 시작된 뒤에 나오는 조각은 이름이 아니라 부연으로 본다
    if (hitData) { notes.push(part); continue; }
    nameParts.push(part);
  }
  return { name: nameParts.join(" - ").trim() || raw.trim(), recovered, notes };
}

/** 서술형 목표에서 방향을 읽어낸다. 못 읽으면 null */
function directionFromText(label: string): "up" | "down" | null {
  if (/감소|저감|축소|절감|줄|낮/u.test(label)) return "down";
  if (/증가|확대|제고|향상|상향|늘/u.test(label)) return "up";
  return null;
}

/** 지표명에 방향이 드러나는 경우 (…률/…량 중 작을수록 좋은 것) */
const DOWN_NAME = /배출량|배출|빈곤율|본인부담|사망률|사망자|폐기물|미세먼지|초미세먼지|온실가스|실업|격차|5\s*분위\s*배율|지니|이직|산업재해|재해율|자살|비만|흡연|음주|누수|에너지\s*(총)?소비량|총소비량|손실|피해|훼손|멸종|오염|체납|미달|불평등|부담률|과밀|노후|결식|위반|사고/u;

// ── 잘린 상대목표 복구 ──────────────────────────────────────
// 원본 파서는 지표표를 줄 단위로 읽어서 "2030: 2017년 대비 / 24.4% 감축" 처럼
// 두 줄로 나뉜 목표를 앞줄에서 끊어 버렸다. 그 결과 온실가스 배출량 목표가
// "2017년 대비"로만 남는다. 계획 2부 원문에서 이어지는 줄을 붙여 복구한다.
const SRC_TEXT = "/home/dyjin/work/SDGs/work/ksdgs_4차/2부.txt";

const norm = (x: string) => x.replace(/[\s･·・]/gu, "");

/** 지표명(정규화) → { 연도 → 온전한 목표 문자열 } */
function loadRepairs(): Map<string, Map<number, string>> {
  const out = new Map<string, Map<number, string>>();
  let text: string;
  try {
    text = fs.readFileSync(SRC_TEXT, "utf8");
  } catch {
    return out; // 원문이 없으면 복구를 건너뛴다 (변환 자체는 계속 동작해야 한다)
  }
  const lines = text.split("\n").map((l) => l.trim());
  const HEAD = /^\(\d+\)\s*(?:\(신규\)\s*)?(.+)$/u;
  const VAL = /^-\s*(\d{4})\s*[:：]\s*(.*)$/u;

  let current: Map<number, string> | null = null;
  for (let i = 0; i < lines.length; i++) {
    const h = HEAD.exec(lines[i]);
    if (h) {
      // 같은 지표명이 부록(변경 내용)에도 다시 나오므로 덮어쓰지 않고 이어 담는다.
      // 덮어쓰면 본문에서 읽은 온전한 목표가 부록의 빈 블록에 지워진다.
      const key = norm(h[1]);
      current = out.get(key) ?? new Map();
      out.set(key, current);
      continue;
    }
    const v = VAL.exec(lines[i]);
    if (v && current) {
      let body = v[2].trim();
      // 다음 줄이 새 항목·새 값·페이지 표시가 아니면 이어지는 줄로 본다
      const next = lines[i + 1] ?? "";
      if (next && !VAL.test(next) && !HEAD.test(next) && !next.startsWith("<<<PAGE") && next.length < 40) {
        body = `${body} ${next}`.replace(/\s+/gu, " ").trim();
      }
      // 먼저 읽은 값(본문)을 우선한다
      if (!current.has(Number(v[1]))) current.set(Number(v[1]), body);
    }
  }
  return out;
}
const REPAIRS = loadRepairs();

/** 목표가 "…년 대비"로 잘렸으면 원문에서 온전한 문자열을 찾아 돌려준다 */
function repairLabel(name: string, year: number, label: string): string | null {
  if (!/^\d{4}\s*년\s*대비$/u.test(label)) return null;
  const full = REPAIRS.get(norm(name))?.get(year);
  return full && norm(full) !== norm(label) ? full : null;
}

// ── CSV 유틸 ─────────────────────────────────────────────────
function esc(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function writeSheet(name: string, header: string[], rows: unknown[][]) {
  const csv = [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n";
  fs.writeFileSync(path.join(OUT, `${name}.csv`), csv, "utf8");
  const tsv = [header.join("\t"), ...rows.map((r) => r.map((v) => (v ?? "")).join("\t"))].join("\n") + "\n";
  fs.writeFileSync(path.join(OUT, `${name}.tsv`), tsv, "utf8");
  console.log(`  ${name.padEnd(11)} ${String(rows.length).padStart(4)}행`);
}

// ── 본체 ─────────────────────────────────────────────────────
const src: Src = JSON.parse(fs.readFileSync(SRC, "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const trackOfGoal = new Map<number, typeof TRACKS[number]>();
for (const t of TRACKS) for (const g of t.goals) trackOfGoal.set(g, t);

const warn: string[] = [];

console.log("생성:");

// tracks
writeSheet("tracks",
  ["track_id", "track_name", "track_desc", "color", "icon", "order", "display"],
  TRACKS.map((t, i) => [t.id, `${t.roman}. ${t.name}`, t.desc, t.color, t.icon, i + 1, "TRUE"]),
);

// goals
const goalRows = src.goals
  .map((g) => {
    const tr = trackOfGoal.get(g.goal);
    if (!tr) { warn.push(`- 목표 ${g.goal} 이 어느 부문에도 속하지 않음 — TRACKS 상수 확인 필요`); return null; }
    return { g, tr, order: tr.goals.indexOf(g.goal) + 1 };
  })
  .filter((x): x is NonNullable<typeof x> => x !== null)
  .sort((a, b) => TRACKS.indexOf(a.tr) - TRACKS.indexOf(b.tr) || a.order - b.order);

writeSheet("goals",
  ["goal_id", "track_id", "goal_no", "goal_name", "goal_desc", "color", "icon", "order", "display"],
  goalRows.map(({ g, tr, order }) => [`G${g.goal}`, tr.id, g.goal, g.title, "", GOAL_COLOR[g.goal], GOAL_ICON[g.goal], order, "TRUE"]),
);

// targets — 소관부처는 하위 지표로 상속시키기 위해 맵으로 보관
const ministryOfTarget = new Map<string, string>();
const targetRows = src.targets.map((t, i) => {
  const m = (t.ministry ?? []).join("·");
  if (m) ministryOfTarget.set(t.id, m);
  else warn.push(`- 세부목표 \`${t.id}\` 소관부처 누락 (원문 p.${t.page})`);
  return [t.id, `G${t.goal}`, t.text, m ? `소관: ${m}` : "", i + 1, "TRUE"];
});
writeSheet("targets", ["target_id", "goal_id", "target_name", "target_desc", "order", "display"], targetRows);

// indicators + values
const indRows: unknown[][] = [];
const valRows: unknown[][] = [];
const headlineCount = new Map<string, number>();
let numericTargets = 0, textTargets = 0, noValues = 0;

for (const [i, ind] of src.indicators.entries()) {
  const cleaned = cleanName(ind.name);
  // 원본 values가 비어 있을 때만 이름에서 복구한 값을 쓴다 (원본이 항상 우선)
  const rawValues = ind.values?.length ? ind.values : cleaned.recovered;
  if (!ind.values?.length && cleaned.recovered.length) {
    warn.push(`- 지표 \`${ind.no}\` 값을 지표명에서 복구함 (${cleaned.recovered.length}건) — 원문 p.${ind.page} 대조 권장`);
  }
  const parsed = rawValues.map(parseValue).filter((p): p is Parsed => p !== null);
  for (const pv of parsed) {
    const fixed = repairLabel(cleaned.name, pv.year, pv.label);
    if (fixed) pv.label = fixed;
  }
  const baseline = parsed.filter((p) => p.year <= 2025).sort((a, b) => b.year - a.year)[0] ?? null;
  const mid = parsed.find((p) => p.year >= 2026 && p.year <= 2035) ?? null;
  const long = parsed.find((p) => p.year >= 2036) ?? null;

  for (const p2 of parsed) {
    if (/^\d{4}\s*년\s*대비$/u.test(p2.label)) {
      warn.push(`- 지표 \`${ind.no}\` ${p2.year} 목표가 "${p2.label}"에서 끊김 — 원문 p.${ind.page}에서 감축률 확인 후 보완 필요`);
    }
  }
  if (!rawValues.length) { noValues++; warn.push(`- 지표 \`${ind.no}\` 값 없음 — 원문 p.${ind.page} 확인 후 수기 입력 필요: ${ind.name.slice(0, 60)}`); }
  if (mid?.value != null) numericTargets++; else if (mid) textTargets++;

  const unit = baseline?.unit || mid?.unit || long?.unit || "";

  // 지표유형
  const kind = mid?.value != null || long?.value != null ? "정량"
    : mid || long ? "정성"
    : baseline ? "모니터링"          // 기준값은 있으나 목표값이 설정되지 않은 관찰용 지표
    : "통계미구축";                  // 원문에 수치가 전혀 없는 지표

  // 방향: 수치 목표가 있으면 값 비교, 없으면 서술/지표명에서 추론
  let direction: "up" | "down" = "up";
  if (baseline?.value != null && mid?.value != null && mid.value !== baseline.value) {
    direction = mid.value < baseline.value ? "down" : "up";
  } else {
    direction = directionFromText(mid?.label ?? long?.label ?? "") ?? (DOWN_NAME.test(cleaned.name) ? "down" : "up");
  }

  // 대표지표: 목표당 최대 2개, 정량 + 기준값 보유 지표를 우선
  const goalKey = ind.target.split("-")[0];
  const used = headlineCount.get(goalKey) ?? 0;
  const isHeadline = used < 2 && kind === "정량" && baseline?.value != null && mid?.value != null;
  if (isHeadline) headlineCount.set(goalKey, used + 1);

  indRows.push([
    ind.no, ind.target, cleaned.name,
    cleaned.notes.join(" · "),             // definition — 이름에서 떼어낸 비고
    ind.method ?? "",                      // method — 전부 null
    unit, direction,
    baseline?.year ?? "", baseline?.value ?? "",
    mid?.year ?? "", mid?.value ?? "",
    long?.year ?? "", long?.value ?? "",
    mid?.label ?? "", long?.label ?? "",
    kind, ind.page,
    "제4차 지속가능발전 기본계획", "",       // source, source_url
    "", ministryOfTarget.get(ind.target) ?? "",  // update_cycle, custodian
    "",                                    // status_override
    isHeadline ? "TRUE" : "FALSE", "TRUE",
    [`제4차 지속가능발전 기본계획 p.${ind.page}`, ...cleaned.notes].join(" · "),
    i + 1,
  ]);

  if (baseline?.value != null) valRows.push([ind.no, baseline.year, baseline.value, "전국", "기준값"]);
}

writeSheet("indicators",
  ["indicator_id", "target_id", "indicator_name", "definition", "method", "unit", "direction",
   "baseline_year", "baseline_value", "target_year", "target_value", "long_year", "long_value",
   "target_label", "long_label", "kind", "source_page", "source", "source_url",
   "update_cycle", "custodian", "status_override", "is_headline", "display", "note", "order"],
  indRows);

writeSheet("values", ["indicator_id", "year", "value", "region", "note"], valRows);
writeSheet("actions", ["action_id", "goal_id", "target_id", "title", "summary", "status", "due_year", "responsible", "last_update", "links"], []);

// config
const today = new Date().toISOString().slice(0, 10);
writeSheet("config", ["key", "value"], [
  ["site_title", "국가지속가능발전목표(K-SDGs) 이행현황"],
  ["site_subtitle", "17개 목표 · 119개 세부목표 · 236개 지표의 이행 상황을 한눈에 확인합니다"],
  ["level0_label", "부문"],
  ["level1_label", "목표"],
  ["level2_label", "세부목표"],
  ["level3_label", "지표"],
  ["framework_name", "제4차 지속가능발전 기본계획 (2021~2040)"],
  ["org_name", "국가지속가능발전연구센터"],
  ["org_parent", "국무조정실 · 한국환경연구원(KEI)"],
  ["target_year_default", "2030"],
  ["long_year_default", "2040"],
  ["last_updated", today],
  ["contact", ""],
  ["hero_headline", "국가지속가능발전목표의 이행 현황을 한 곳에서"],
  ["hero_keywords", "온실가스;재생에너지;상대빈곤율;미세먼지;고용률;생물다양성"],
  ["data_status", "기준값·목표값 기반 (연도별 시계열 구축 중)"],
  ["footer_note", "본 페이지의 지표 수치는 제4차 지속가능발전 기본계획 원문에서 추출한 값이며, 소관부처의 최신 공표 통계와 다를 수 있습니다."],
]);

// ── 검증 게이트 ──────────────────────────────────────────────
const expect = { 목표: 17, 세부목표: 119, 지표: 236 };
const got = { 목표: goalRows.length, 세부목표: targetRows.length, 지표: indRows.length };
console.log("\n검증:");
let failed = false;
for (const k of Object.keys(expect) as (keyof typeof expect)[]) {
  const ok = expect[k] === got[k];
  if (!ok) failed = true;
  console.log(`  ${ok ? "✔" : "✘"} ${k}: ${got[k]} (기대 ${expect[k]})`);
}
console.log(`  · 수치 목표 ${numericTargets} / 서술형 목표 ${textTargets} / 값 없음 ${noValues}`);
const kindCount = indRows.reduce<Record<string, number>>((a, r) => { const k = String(r[15]); a[k] = (a[k] ?? 0) + 1; return a; }, {});
console.log(`  · 지표유형 ${Object.entries(kindCount).map(([k, v]) => `${k} ${v}`).join(" / ")}`);
console.log(`  · 실적값 ${valRows.length}행, 대표지표 ${indRows.filter((r) => r[22] === "TRUE").length}개`);

fs.writeFileSync(REPORT,
  `# build-sheets 검수 목록\n\n생성일 ${today} · 원본 \`${SRC}\`\n\n` +
  `- 목표 ${got.목표} / 세부목표 ${got.세부목표} / 지표 ${got.지표}\n` +
  `- 수치 목표 ${numericTargets} · 서술형 목표 ${textTargets} · 값 없음 ${noValues}\n\n` +
  `## 수기 확인 필요 (${warn.length}건)\n\n${warn.join("\n")}\n`, "utf8");
console.log(`\n검수 목록 ${warn.length}건 → scripts/build-sheets.report.md`);

if (failed) { console.error("\n✘ 건수 불일치 — 중단"); process.exit(1); }
console.log("✔ 완료");
