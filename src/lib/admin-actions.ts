"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin, login, logout, superLogin, superLogout } from "@/lib/auth";
import { CSV_TYPES, type CsvType } from "@/lib/csv";
import { NAV_ITEMS } from "@/lib/nav-items";
import Papa from "papaparse";
import fs from "node:fs";
import path from "node:path";

export interface ActionResult {
  ok: boolean;
  message: string;
}

// ── 유틸 ────────────────────────────────────────────────────────
const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
};
const req = (fd: FormData, k: string, label: string) => {
  const v = s(fd, k);
  if (!v) throw new Error(`${label}은(는) 필수 입력입니다.`);
  return v;
};
const n = (fd: FormData, k: string) => {
  const v = s(fd, k);
  if (v === null) return null;
  const x = Number(v.replace(/,/g, ""));
  if (!Number.isFinite(x)) throw new Error(`숫자가 아닌 값이 있습니다: ${v}`);
  return x;
};
const i = (fd: FormData, k: string) => {
  const x = n(fd, k);
  return x === null ? null : Math.round(x);
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

async function log(action: string, entity: string, entityId: string | null, label: string, detail?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      label,
      detail: detail === undefined ? null : JSON.stringify(detail),
    },
  });
}

function refresh() {
  revalidatePath("/", "layout");
}

function fail(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
  // Prisma 고유키 위반을 사람이 읽을 수 있게
  if (message.includes("Unique constraint")) {
    return { ok: false, message: "이미 같은 번호(코드)가 존재합니다. 다른 번호를 사용해 주세요." };
  }
  return { ok: false, message };
}

// ── 인증 ────────────────────────────────────────────────────────
export async function loginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const pw = String(fd.get("password") ?? "");
  if (!pw) return { ok: false, message: "비밀번호를 입력해 주세요." };
  const ok = await login(pw);
  if (!ok) return { ok: false, message: "비밀번호가 일치하지 않습니다." };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  // 로그아웃하면 로그인 화면이 아니라 공개 대시보드로 보낸다
  await superLogout();
  redirect("/");
}

/** 관리자 로그인 상태에서 한 번 더 — 슈퍼관리자 승격 */
export async function superLoginAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const pw = String(fd.get("password") ?? "");
    if (!pw) return { ok: false, message: "비밀번호를 입력해 주세요." };
    if (!(await superLogin(pw))) {
      await log("login", "Super", null, "슈퍼관리자 인증 실패");
      return { ok: false, message: "슈퍼관리자 비밀번호가 일치하지 않습니다." };
    }
    await log("login", "Super", null, "슈퍼관리자 인증");
    refresh();
    return { ok: true, message: "슈퍼관리자로 전환했습니다. 30분간 유효합니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function superLogoutAction() {
  await superLogout();
  refresh();
}

/**
 * 상단 메뉴 노출·순서 저장 — 슈퍼관리자 전용.
 *
 * 사이트 어느 화면에서든 보이는 부분이라 일반 관리자 권한과 분리했다.
 * 저장 형식은 설정 `nav_hidden`(숨길 key) / `nav_order`(전체 key 순서), 둘 다 세미콜론 구분.
 */
export async function saveNavSettings(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const known = new Set(NAV_ITEMS.map((x) => x.key));
    const clean = (raw: string) =>
      raw
        .split(";")
        .map((x) => x.trim())
        .filter((x) => known.has(x));

    const order = clean(String(fd.get("order") ?? ""));
    const hidden = clean(String(fd.get("hidden") ?? ""));
    if (hidden.length === NAV_ITEMS.length) {
      return { ok: false, message: "메뉴를 전부 숨길 수는 없습니다. 최소 한 개는 남겨 주세요." };
    }

    const home = clean(String(fd.get("home") ?? ""))[0] ?? "";
    if (home && hidden.includes(home)) {
      return { ok: false, message: "첫 화면으로 지정한 메뉴는 숨길 수 없습니다." };
    }

    for (const [key, value] of [
      ["nav_order", order.join(";")],
      ["nav_hidden", hidden.join(";")],
      ["nav_home", home],
    ] as [string, string][]) {
      await prisma.config.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    const shown = NAV_ITEMS.filter((x) => !hidden.includes(x.key)).length;
    await log("update", "Config", null, `상단 메뉴 ${shown}/${NAV_ITEMS.length}개 노출`, { order, hidden, home });
    refresh();
    return { ok: true, message: "상단 메뉴 설정을 저장했습니다." };
  } catch (e) {
    return fail(e);
  }
}

// ── 모니터링 영역 ───────────────────────────────────────────────
export async function saveTrack(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = s(fd, "id");
    const data = {
      code: req(fd, "code", "영역 코드"),
      name: req(fd, "name", "영역명"),
      description: s(fd, "description"),
      color: s(fd, "color"),
      icon: s(fd, "icon"),
      order: i(fd, "order") ?? 0,
      published: bool(fd, "published"),
    };
    if (!/^[a-z0-9-]+$/.test(data.code)) {
      return { ok: false, message: "영역 코드는 주소에 쓰이므로 영문 소문자·숫자·하이픈만 가능합니다." };
    }
    if (id) {
      const t = await prisma.track.update({ where: { id }, data });
      await log("update", "Track", t.id, t.name, data);
    } else {
      const t = await prisma.track.create({ data });
      await log("create", "Track", t.id, t.name, data);
    }
    refresh();
    return { ok: true, message: id ? "영역을 저장했습니다." : "영역을 추가했습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTrack(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const t = await prisma.track.findUnique({
      where: { id },
      include: { goals: { include: { targets: { include: { indicators: true } } } } },
    });
    if (!t) return { ok: false, message: "이미 삭제된 영역입니다." };
    const goals = t.goals.length;
    const targets = t.goals.reduce((a, g) => a + g.targets.length, 0);
    const indicators = t.goals.reduce((a, g) => a + g.targets.reduce((b2, x) => b2 + x.indicators.length, 0), 0);
    await prisma.track.delete({ where: { id } });
    await log("delete", "Track", id, t.name, { 목표: goals, 세부목표: targets, 지표: indicators });
    refresh();
    return { ok: true, message: `"${t.name}" 및 하위 ${indicators}개 지표를 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── 목표 ────────────────────────────────────────────────────────
export async function saveGoal(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = s(fd, "id");
    const data = {
      code: req(fd, "code", "목표 코드"),
      trackId: req(fd, "trackId", "상위 영역"),
      no: req(fd, "no", "목표 번호"),
      name: req(fd, "name", "목표명"),
      description: s(fd, "description"),
      color: s(fd, "color"),
      icon: s(fd, "icon"),
      order: i(fd, "order") ?? 0,
      published: bool(fd, "published"),
    };
    if (id) {
      const g = await prisma.goal.update({ where: { id }, data });
      await log("update", "Goal", g.id, `${g.no}. ${g.name}`, data);
    } else {
      const g = await prisma.goal.create({ data });
      await log("create", "Goal", g.id, `${g.no}. ${g.name}`, data);
    }
    refresh();
    return { ok: true, message: id ? "목표를 저장했습니다." : "목표를 추가했습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGoal(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const g = await prisma.goal.findUnique({ where: { id }, include: { targets: true } });
    if (!g) return { ok: false, message: "이미 삭제된 목표입니다." };
    await prisma.goal.delete({ where: { id } });
    await log("delete", "Goal", id, `${g.no}. ${g.name}`, { 하위세부목표: g.targets.length });
    refresh();
    return { ok: true, message: `"${g.name}" 및 하위 항목을 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── 세부목표 ─────────────────────────────────────────────────────
export async function saveTarget(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = s(fd, "id");
    const data = {
      code: req(fd, "code", "세부목표 코드"),
      goalId: req(fd, "goalId", "상위 목표"),
      name: req(fd, "name", "세부목표명"),
      description: s(fd, "description"),
      order: i(fd, "order") ?? 0,
      published: bool(fd, "published"),
    };
    if (id) {
      const t = await prisma.target.update({ where: { id }, data });
      await log("update", "Target", t.id, `${t.code} ${t.name}`, data);
    } else {
      const t = await prisma.target.create({ data });
      await log("create", "Target", t.id, `${t.code} ${t.name}`, data);
    }
    refresh();
    return { ok: true, message: id ? "세부목표를 저장했습니다." : "세부목표를 추가했습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTarget(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const t = await prisma.target.findUnique({ where: { id }, include: { indicators: true } });
    if (!t) return { ok: false, message: "이미 삭제된 세부목표입니다." };
    await prisma.target.delete({ where: { id } });
    await log("delete", "Target", id, `${t.code} ${t.name}`, { 하위지표: t.indicators.length });
    refresh();
    return { ok: true, message: `"${t.code}" 및 하위 지표를 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── 지표 ────────────────────────────────────────────────────────
export async function saveIndicator(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = s(fd, "id");
    const data = {
      code: req(fd, "code", "지표 번호"),
      targetId: req(fd, "targetId", "상위 세부목표"),
      name: req(fd, "name", "지표명"),
      definition: s(fd, "definition"),
      method: s(fd, "method"),
      unit: s(fd, "unit"),
      direction: s(fd, "direction") === "down" ? "down" : "up",
      baselineYear: i(fd, "baselineYear"),
      baselineValue: n(fd, "baselineValue"),
      targetYear: i(fd, "targetYear"),
      targetValue: n(fd, "targetValue"),
      longYear: i(fd, "longYear"),
      longValue: n(fd, "longValue"),
      targetLabel: s(fd, "targetLabel"),
      longLabel: s(fd, "longLabel"),
      kind: s(fd, "kind"),
      sourcePage: i(fd, "sourcePage"),
      source: s(fd, "source"),
      sourceUrl: s(fd, "sourceUrl"),
      updateCycle: s(fd, "updateCycle"),
      custodian: s(fd, "custodian"),
      statusOverride: s(fd, "statusOverride"),
      isHeadline: bool(fd, "isHeadline"),
      published: bool(fd, "published"),
      note: s(fd, "note"),
      order: i(fd, "order") ?? 0,
    };
    if (id) {
      const ind = await prisma.indicator.update({ where: { id }, data });
      await log("update", "Indicator", ind.id, `${ind.code} ${ind.name}`, data);
      refresh();
      return { ok: true, message: "지표를 저장했습니다." };
    }
    const ind = await prisma.indicator.create({ data });
    await log("create", "Indicator", ind.id, `${ind.code} ${ind.name}`, data);
    refresh();
    redirect(`/admin/indicators/${ind.id}`);
  } catch (e) {
    // redirect()는 예외로 동작하므로 그대로 흘려보낸다
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return fail(e);
  }
}

export async function deleteIndicator(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const ind = await prisma.indicator.findUnique({ where: { id }, include: { values: true } });
    if (!ind) return { ok: false, message: "이미 삭제된 지표입니다." };
    await prisma.indicator.delete({ where: { id } });
    await log("delete", "Indicator", id, `${ind.code} ${ind.name}`, { 실적값: ind.values.length });
    refresh();
    return { ok: true, message: `"${ind.name}"을(를) 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

/** 목록에서 공개/비공개 토글 */
export async function toggleIndicatorPublished(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const ind = await prisma.indicator.findUnique({ where: { id } });
    if (!ind) return { ok: false, message: "지표를 찾을 수 없습니다." };
    const updated = await prisma.indicator.update({ where: { id }, data: { published: !ind.published } });
    await log("publish", "Indicator", id, `${ind.code} ${ind.name}`, { published: updated.published });
    refresh();
    return { ok: true, message: updated.published ? "공개로 전환했습니다." : "임시저장(비공개)으로 전환했습니다." };
  } catch (e) {
    return fail(e);
  }
}

// ── 실적값 ───────────────────────────────────────────────────────
export async function saveValue(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const indicatorId = req(fd, "indicatorId", "지표");
    const year = i(fd, "year");
    const value = n(fd, "value");
    if (year === null) return { ok: false, message: "연도를 입력해 주세요." };
    if (value === null) return { ok: false, message: "값을 입력해 주세요." };
    const region = s(fd, "region") ?? "전국";
    const note = s(fd, "note");

    const ind = await prisma.indicator.findUnique({ where: { id: indicatorId } });
    await prisma.indicatorValue.upsert({
      where: { indicatorId_year_region: { indicatorId, year, region } },
      create: { indicatorId, year, value, region, note },
      update: { value, note },
    });
    await log("update", "IndicatorValue", indicatorId, `${ind?.code ?? ""} ${year}년`, { year, value, region, note });
    refresh();
    return { ok: true, message: `${year}년 실적값을 저장했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteValue(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const v = await prisma.indicatorValue.findUnique({ where: { id }, include: { indicator: true } });
    if (!v) return { ok: false, message: "이미 삭제된 값입니다." };
    await prisma.indicatorValue.delete({ where: { id } });
    await log("delete", "IndicatorValue", id, `${v.indicator.code} ${v.year}년`, { value: v.value });
    refresh();
    return { ok: true, message: `${v.year}년 값을 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── 이행과제 ─────────────────────────────────────────────────────
export async function saveActionItem(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = s(fd, "id");
    const data = {
      code: req(fd, "code", "과제 번호"),
      goalId: s(fd, "goalId"),
      targetId: s(fd, "targetId"),
      title: req(fd, "title", "과제명"),
      summary: s(fd, "summary"),
      status: s(fd, "status") ?? "추진중",
      dueYear: i(fd, "dueYear"),
      responsible: s(fd, "responsible"),
      lastUpdate: s(fd, "lastUpdate"),
      links: s(fd, "links"),
      order: i(fd, "order") ?? 0,
      published: bool(fd, "published"),
    };
    if (id) {
      const a = await prisma.action.update({ where: { id }, data });
      await log("update", "Action", a.id, `${a.code} ${a.title}`, data);
    } else {
      const a = await prisma.action.create({ data });
      await log("create", "Action", a.id, `${a.code} ${a.title}`, data);
    }
    refresh();
    return { ok: true, message: id ? "이행과제를 저장했습니다." : "이행과제를 추가했습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteActionItem(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const a = await prisma.action.findUnique({ where: { id } });
    if (!a) return { ok: false, message: "이미 삭제된 과제입니다." };
    await prisma.action.delete({ where: { id } });
    await log("delete", "Action", id, `${a.code} ${a.title}`);
    refresh();
    return { ok: true, message: `"${a.title}"을(를) 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── 사이트 설정 ───────────────────────────────────────────────────
export async function saveConfig(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const entries: [string, string][] = [];
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith("cfg_")) continue;
      entries.push([k.slice(4), typeof v === "string" ? v : ""]);
    }
    // 새 항목 추가 지원
    const newKey = s(fd, "new_key");
    const newValue = fd.get("new_value");
    if (newKey) entries.push([newKey, typeof newValue === "string" ? newValue : ""]);

    for (const [key, value] of entries) {
      await prisma.config.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    await log("update", "Config", null, `설정 ${entries.length}건`, Object.fromEntries(entries));
    refresh();
    return { ok: true, message: "설정을 저장했습니다." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteConfig(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const key = req(fd, "key", "key");
    await prisma.config.delete({ where: { key } });
    await log("delete", "Config", null, `설정 ${key}`);
    refresh();
    return { ok: true, message: `"${key}" 설정을 삭제했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── CSV 가져오기 ──────────────────────────────────────────────────
type Row = Record<string, string>;

const t = (r: Row, k: string) => {
  const v = (r[k] ?? "").trim();
  return v === "" ? null : v;
};
const tn = (r: Row, k: string) => {
  const v = t(r, k);
  if (v === null) return null;
  const x = Number(v.replace(/,/g, ""));
  return Number.isFinite(x) ? x : null;
};
const ti = (r: Row, k: string) => {
  const x = tn(r, k);
  return x === null ? null : Math.round(x);
};
const tb = (r: Row, k: string, fallback: boolean) => {
  const v = (r[k] ?? "").trim().toUpperCase();
  if (["TRUE", "Y", "1", "O"].includes(v)) return true;
  if (["FALSE", "N", "0", "X"].includes(v)) return false;
  return fallback;
};

/**
 * CSV 업로드. 기존 행은 코드(고유번호) 기준으로 덮어쓰고 없으면 새로 만든다(upsert).
 * replace = true 이면 해당 종류의 기존 데이터를 모두 지우고 넣는다.
 */
export async function importCsv(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const type = String(fd.get("type") ?? "") as CsvType;
    if (!CSV_TYPES.includes(type)) return { ok: false, message: "가져올 데이터 종류를 선택해 주세요." };

    const file = fd.get("file");
    let text = typeof fd.get("text") === "string" ? String(fd.get("text")) : "";
    if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
      text = new TextDecoder("utf-8").decode(await (file as File).arrayBuffer());
    }
    text = text.replace(/^﻿/, "").trim();
    if (!text) return { ok: false, message: "CSV 파일을 선택하거나 내용을 붙여넣어 주세요." };

    // 탭 구분(TSV)도 그대로 받아준다
    const delimiter = text.split("\n")[0].includes("\t") ? "\t" : ",";
    const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, delimiter });
    const rows = parsed.data.filter((r) => Object.values(r).some((v) => (v ?? "").trim() !== ""));
    if (!rows.length) return { ok: false, message: "읽을 수 있는 행이 없습니다. 첫 줄이 헤더인지 확인해 주세요." };

    const replace = fd.get("replace") === "on";
    const warnings: string[] = [];
    let created = 0;
    let updated = 0;

    const tracks = new Map((await prisma.track.findMany()).map((t) => [t.code, t.id]));
    const goals = new Map((await prisma.goal.findMany()).map((g) => [g.code, g.id]));
    const targets = new Map((await prisma.target.findMany()).map((x) => [x.code, x.id]));
    const indicators = new Map((await prisma.indicator.findMany()).map((x) => [x.code, x.id]));

    if (replace) {
      if (type === "tracks") await prisma.track.deleteMany();
      if (type === "goals") await prisma.goal.deleteMany();
      if (type === "targets") await prisma.target.deleteMany();
      if (type === "indicators") await prisma.indicator.deleteMany();
      if (type === "values") await prisma.indicatorValue.deleteMany();
      if (type === "actions") await prisma.action.deleteMany();
      if (type === "config") await prisma.config.deleteMany();
      tracks.clear();
      goals.clear();
      targets.clear();
      indicators.clear();
    }

    for (const [idx, r] of rows.entries()) {
      const line = idx + 2;
      try {
        if (type === "tracks") {
          const code = t(r, "track_id");
          if (!code) throw new Error("track_id 없음");
          const data = {
            name: t(r, "track_name") ?? code,
            description: t(r, "track_desc"),
            color: t(r, "color"),
            icon: t(r, "icon"),
            order: ti(r, "order") ?? idx + 1,
            published: tb(r, "display", true),
          };
          const existing = tracks.get(code);
          const x = await prisma.track.upsert({ where: { code }, create: { code, ...data }, update: data });
          tracks.set(code, x.id);
          if (existing) updated++;
          else created++;
        } else if (type === "goals") {
          const code = t(r, "goal_id");
          const trackCode = t(r, "track_id");
          if (!code) throw new Error("goal_id 없음");
          const trackId = trackCode ? tracks.get(trackCode) : undefined;
          if (!trackId) throw new Error(`상위 영역 ${trackCode ?? "(비어있음)"} 를 찾을 수 없음`);
          const data = {
            trackId,
            no: t(r, "goal_no") ?? code,
            name: t(r, "goal_name") ?? code,
            description: t(r, "goal_desc"),
            color: t(r, "color"),
            icon: t(r, "icon"),
            order: ti(r, "order") ?? idx + 1,
            published: tb(r, "display", true),
          };
          const existing = goals.get(code);
          const g = await prisma.goal.upsert({ where: { code }, create: { code, ...data }, update: data });
          goals.set(code, g.id);
          if (existing) updated++;
          else created++;
        } else if (type === "targets") {
          const code = t(r, "target_id");
          const goalCode = t(r, "goal_id");
          if (!code) throw new Error("target_id 없음");
          const goalId = goalCode ? goals.get(goalCode) : undefined;
          if (!goalId) throw new Error(`상위 목표 ${goalCode ?? "(비어있음)"} 를 찾을 수 없음`);
          const data = {
            goalId,
            name: t(r, "target_name") ?? code,
            description: t(r, "target_desc"),
            order: ti(r, "order") ?? idx + 1,
            published: tb(r, "display", true),
          };
          const existing = targets.get(code);
          const x = await prisma.target.upsert({ where: { code }, create: { code, ...data }, update: data });
          targets.set(code, x.id);
          if (existing) updated++;
          else created++;
        } else if (type === "indicators") {
          const code = t(r, "indicator_id");
          const targetCode = t(r, "target_id");
          if (!code) throw new Error("indicator_id 없음");
          const targetId = targetCode ? targets.get(targetCode) : undefined;
          if (!targetId) throw new Error(`상위 세부목표 ${targetCode ?? "(비어있음)"} 를 찾을 수 없음`);
          const data = {
            targetId,
            name: t(r, "indicator_name") ?? code,
            definition: t(r, "definition"),
            method: t(r, "method"),
            unit: t(r, "unit"),
            direction: (t(r, "direction") ?? "up").toLowerCase() === "down" ? "down" : "up",
            baselineYear: ti(r, "baseline_year"),
            baselineValue: tn(r, "baseline_value"),
            targetYear: ti(r, "target_year"),
            targetValue: tn(r, "target_value"),
            longYear: ti(r, "long_year"),
            longValue: tn(r, "long_value"),
            targetLabel: t(r, "target_label"),
            longLabel: t(r, "long_label"),
            kind: t(r, "kind"),
            sourcePage: ti(r, "source_page"),
            source: t(r, "source"),
            sourceUrl: t(r, "source_url"),
            updateCycle: t(r, "update_cycle"),
            custodian: t(r, "custodian"),
            statusOverride: t(r, "status_override"),
            isHeadline: tb(r, "is_headline", false),
            published: tb(r, "display", true),
            note: t(r, "note"),
            order: ti(r, "order") ?? idx + 1,
          };
          const existing = indicators.get(code);
          const x = await prisma.indicator.upsert({ where: { code }, create: { code, ...data }, update: data });
          indicators.set(code, x.id);
          if (existing) updated++;
          else created++;
        } else if (type === "values") {
          const indCode = t(r, "indicator_id");
          const year = ti(r, "year");
          const value = tn(r, "value");
          const region = t(r, "region") ?? "전국";
          if (!indCode) throw new Error("indicator_id 없음");
          const indicatorId = indicators.get(indCode);
          if (!indicatorId) throw new Error(`지표 ${indCode} 를 찾을 수 없음`);
          if (year === null) throw new Error("year 없음");
          if (value === null) throw new Error("value 없음");
          const res = await prisma.indicatorValue.upsert({
            where: { indicatorId_year_region: { indicatorId, year, region } },
            create: { indicatorId, year, value, region, note: t(r, "note") },
            update: { value, note: t(r, "note") },
          });
          if (res.createdAt.getTime() === res.updatedAt.getTime()) created++;
          else updated++;
        } else if (type === "actions") {
          const code = t(r, "action_id");
          if (!code) throw new Error("action_id 없음");
          const goalCode = t(r, "goal_id");
          const targetCode = t(r, "target_id");
          const data = {
            goalId: goalCode ? (goals.get(goalCode) ?? null) : null,
            targetId: targetCode ? (targets.get(targetCode) ?? null) : null,
            title: t(r, "title") ?? code,
            summary: t(r, "summary"),
            status: t(r, "status") ?? "추진중",
            dueYear: ti(r, "due_year"),
            responsible: t(r, "responsible"),
            lastUpdate: t(r, "last_update"),
            links: t(r, "links"),
            order: ti(r, "order") ?? idx + 1,
            published: tb(r, "display", true),
          };
          const before = await prisma.action.findUnique({ where: { code } });
          await prisma.action.upsert({ where: { code }, create: { code, ...data }, update: data });
          if (before) updated++;
          else created++;
        } else if (type === "plans") {
          const seq = t(r, "seq");
          if (!seq) throw new Error("seq 없음");
          // has_doc / doc_file / doc_size 는 public/plans/ 의 실제 파일에서만 나온다.
          // CSV로 켜지 못하게 막아야 공개 화면에 깨진 내려받기 버튼이 생기지 않는다.
          const data = {
            kind: t(r, "kind"),
            name: t(r, "plan_name") ?? seq,
            law: t(r, "law"),
            article: t(r, "article"),
            edition: t(r, "edition"),
            period: t(r, "period"),
            cycle: t(r, "cycle"),
            ministry: t(r, "ministry"),
            confidence: t(r, "confidence"),
            docNote: t(r, "doc_note"),
            remark: t(r, "remark"),
            sourceUrl: t(r, "source_url"),
            note: t(r, "note"),
            published: tb(r, "display", true),
            order: ti(r, "order") ?? idx + 1,
          };
          const before = await prisma.plan.findUnique({ where: { seq } });
          await prisma.plan.upsert({ where: { seq }, create: { seq, ...data }, update: data });
          if (before) updated++;
          else created++;
        } else if (type === "config") {
          const key = t(r, "key");
          if (!key) throw new Error("key 없음");
          const value = r["value"] ?? "";
          const before = await prisma.config.findUnique({ where: { key } });
          await prisma.config.upsert({ where: { key }, create: { key, value }, update: { value } });
          if (before) updated++;
          else created++;
        }
      } catch (rowErr) {
        warnings.push(`${line}행: ${rowErr instanceof Error ? rowErr.message : "오류"}`);
      }
    }

    await log("import", type, null, `CSV 가져오기 (${type})`, { created, updated, skipped: warnings.length, replace });
    refresh();

    const base = `${created}건 추가, ${updated}건 수정`;
    if (warnings.length) {
      return {
        ok: true,
        message: `${base}, ${warnings.length}건 건너뜀 — ${warnings.slice(0, 3).join(" / ")}${warnings.length > 3 ? " …" : ""}`,
      };
    }
    return { ok: true, message: `${base} 완료했습니다.` };
  } catch (e) {
    return fail(e);
  }
}

// ── 중ㆍ장기 행정계획 ──────────────────────────────────────────
// 원문 PDF는 public/plans/ 의 파일이고, 여기서는 목록 메타데이터만 고친다.
// hasDoc 은 손으로 켜지 못하게 한다 — 파일이 없는데 켜면 공개 화면에
// 깨진 내려받기 버튼이 생긴다. 파일 유무는 scripts/build-plans.ts 가 확인한다.
export async function savePlan(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = s(fd, "id");
    const data = {
      seq: req(fd, "seq", "연번"),
      kind: s(fd, "kind"),
      name: req(fd, "name", "계획명"),
      law: s(fd, "law"),
      article: s(fd, "article"),
      edition: s(fd, "edition"),
      period: s(fd, "period"),
      cycle: s(fd, "cycle"),
      ministry: s(fd, "ministry"),
      confidence: s(fd, "confidence"),
      remark: s(fd, "remark"),
      sourceUrl: s(fd, "sourceUrl"),
      note: s(fd, "note"),
      published: bool(fd, "published"),
      order: i(fd, "order") ?? 0,
    };
    if (id) {
      const p = await prisma.plan.update({ where: { id }, data });
      await log("update", "Plan", p.id, `${p.seq} ${p.name}`, data);
      refresh();
      return { ok: true, message: "행정계획을 저장했습니다." };
    }
    const p = await prisma.plan.create({ data });
    await log("create", "Plan", p.id, `${p.seq} ${p.name}`, data);
    refresh();
    return { ok: true, message: "행정계획을 추가했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "저장에 실패했습니다." };
  }
}

export async function deletePlan(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const p = await prisma.plan.delete({ where: { id } });
    await log("delete", "Plan", null, `${p.seq} ${p.name}`);
    refresh();
    return { ok: true, message: "행정계획을 삭제했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "삭제에 실패했습니다." };
  }
}

export async function togglePlanPublished(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const cur = await prisma.plan.findUnique({ where: { id } });
    if (!cur) throw new Error("대상을 찾을 수 없습니다.");
    const p = await prisma.plan.update({ where: { id }, data: { published: !cur.published } });
    await log("publish", "Plan", p.id, `${p.seq} ${p.name}`, { published: p.published });
    refresh();
    return { ok: true, message: p.published ? "공개로 전환했습니다." : "비공개로 전환했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "변경에 실패했습니다." };
  }
}


// ── 행정계획 원문 파일 ─────────────────────────────────────────
const PLAN_DOC_DIR = path.join(process.cwd(), "public", "plans");
/** 원문으로 받아들일 확장자. 그 외는 거른다 — 아무 파일이나 공개 폴더에 떨어지면 안 된다. */
const ALLOWED_DOC = new Set([".pdf", ".hwp", ".hwpx"]);
const MAX_DOC_BYTES = 80 * 1024 * 1024;

/** 파일명에서 경로 요소·제어문자·파일시스템 금칙문자를 걷어낸다 */
function safeDocName(raw: string): string {
  const base = path
    .basename(raw)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return base.replace(/^\.+/, "") || "문서";
}

/**
 * 이미 들어와 있는 149건의 파일명 규칙에 맞춘다: `계획명_제N차.pdf` (차수가 없으면 `계획명.pdf`).
 * 실제 파일 148/149가 이 규칙을 따르고 있어서, 올린 파일도 같은 규칙으로 이름을 다시 붙인다.
 * 원래 올린 파일명은 버린다 — 목록과 파일명이 따로 놀면 나중에 대조가 안 된다.
 */
function planDocName(planName: string, edition: string | null, ext: string): string {
  const ed = (edition ?? "").trim();
  const withEd = /^제\s*\d+\s*(차|단계)$/u.test(ed) ? `${planName}_${ed.replace(/\s+/g, "")}` : planName;
  return `${safeDocName(withEd)}${ext}`;
}

export async function uploadPlanDoc(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("올릴 파일을 선택하세요.");
    if (file.size > MAX_DOC_BYTES) {
      throw new Error(`파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(0)}MB). 80MB 이하만 올릴 수 있습니다.`);
    }

    const ext = path.extname(safeDocName(file.name)).toLowerCase();
    if (!ALLOWED_DOC.has(ext)) throw new Error(`허용되지 않는 형식입니다 (${ext || "확장자 없음"}). PDF·HWP·HWPX만 됩니다.`);

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new Error("대상 계획을 찾을 수 없습니다.");

    // 기존 149건과 같은 규칙으로 이름을 다시 붙인다
    let stored = planDocName(plan.name, plan.edition, ext);
    // 다른 계획이 이미 그 이름을 쓰고 있으면 연번을 붙여 피한다
    const taken = await prisma.plan.findFirst({
      where: { docFile: `/plans/${stored}`, id: { not: id } },
      select: { seq: true },
    });
    if (taken) stored = planDocName(`${plan.name}(${plan.seq})`, plan.edition, ext);

    const abs = path.resolve(PLAN_DOC_DIR, stored);
    if (!abs.startsWith(PLAN_DOC_DIR + path.sep)) throw new Error("잘못된 파일 경로입니다.");

    fs.mkdirSync(PLAN_DOC_DIR, { recursive: true });
    fs.writeFileSync(abs, Buffer.from(await file.arrayBuffer()));

    // 예전 파일이 남아 있으면 지운다 (이름이 바뀐 경우)
    const prevBase = plan.docFile ? path.basename(plan.docFile) : null;
    if (prevBase && prevBase !== stored) {
      try { fs.unlinkSync(path.resolve(PLAN_DOC_DIR, prevBase)); } catch { /* 없으면 그만 */ }
    }

    const size = fs.statSync(abs).size;
    await prisma.plan.update({
      where: { id },
      data: { hasDoc: true, docFile: `/plans/${stored}`, docSize: size },
    });
    await log("update", "Plan", id, `${plan.seq} ${plan.name} — 원문 업로드`, { file: stored, size, uploaded: file.name });
    refresh();
    return {
      ok: true,
      message: `원문을 올렸습니다 — ${stored} (${(size / 1024 / 1024).toFixed(1)}MB)`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "업로드에 실패했습니다." };
  }
}

export async function deletePlanDoc(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = req(fd, "id", "id");
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new Error("대상 계획을 찾을 수 없습니다.");

    if (plan.docFile) {
      const abs = path.resolve(PLAN_DOC_DIR, path.basename(plan.docFile));
      if (abs.startsWith(PLAN_DOC_DIR + path.sep)) {
        try { fs.unlinkSync(abs); } catch { /* 이미 없으면 그만 */ }
      }
    }
    await prisma.plan.update({ where: { id }, data: { hasDoc: false, docFile: null, docSize: null } });
    await log("delete", "Plan", id, `${plan.seq} ${plan.name} — 원문 삭제`);
    refresh();
    return { ok: true, message: "원문 파일을 삭제했습니다." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "삭제에 실패했습니다." };
  }
}
