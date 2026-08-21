"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadIcon, ExternalLinkIcon, SearchIcon, XIcon, FileTextIcon, FileXIcon, ArchiveIcon } from "lucide-react";

export interface PlanRow {
  id: string;
  seq: string;
  name: string;
  law: string | null;
  article: string | null;
  edition: string | null;
  period: string | null;
  cycle: string | null;
  ministry: string | null;
  confidence: string | null;
  hasDoc: boolean;
  docFile: string | null;
  docSize: number | null;
  remark: string | null;
  sourceUrl: string | null;
  note: string | null;
}

/** 신뢰도 배지 색 — 근거를 못 찾은 항목을 확인된 항목과 같아 보이게 두지 않는다 */
const CONF: Record<string, { color: string; bg: string; desc: string }> = {
  확인: { color: "#1F6E31", bg: "rgba(43,138,62,0.10)", desc: "정부 원문·공식 발표로 확인" },
  참고: { color: "#C2490A", bg: "rgba(232,89,12,0.10)", desc: "언론·2차자료 또는 확정본 미확인" },
  미확인: { color: "#6C757D", bg: "rgba(173,181,189,0.18)", desc: "근거를 찾지 못함" },
  해당없음: { color: "#5C6369", bg: "rgba(134,142,150,0.12)", desc: "지자체가 개별 수립" },
};

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export function PlansExplorer({ plans, orgName }: { plans: PlanRow[]; orgName?: string }) {
  const [q, setQ] = useState("");
  const [ministry, setMinistry] = useState("all");
  const [onlyDoc, setOnlyDoc] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (seq: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(seq)) next.delete(seq);
      else next.add(seq);
      return next;
    });

  const ministries = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of plans) {
      const key = p.ministry?.trim() || "미지정";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
  }, [plans]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return plans.filter((p) => {
      if (onlyDoc && !p.hasDoc) return false;
      if (ministry !== "all" && (p.ministry?.trim() || "미지정") !== ministry) return false;
      if (kw) {
        const hay = `${p.seq} ${p.name} ${p.law ?? ""} ${p.ministry ?? ""} ${p.edition ?? ""} ${p.remark ?? ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [plans, q, ministry, onlyDoc]);

  const shownWithDoc = filtered.filter((p) => p.hasDoc).length;
  const totalWithDoc = plans.filter((p) => p.hasDoc).length;
  // 필터가 걸려 있으면 "현재 목록"만, 아니면 전체를 받는다
  const isAll = ministry === "all" && !q.trim() && !onlyDoc;
  const pickAllHref = isAll
    ? "/api/plans/download"
    : `/api/plans/download?seq=${filtered.filter((p) => p.hasDoc).map((p) => p.seq).join(",")}`;

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="계획명, 근거법률, 소관부처로 검색"
              className="pl-9"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="검색어 지우기"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={onlyDoc}
              onChange={(e) => setOnlyDoc(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            원문 있는 것만
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={ministry === "all"} onClick={() => setMinistry("all")}>
            전체 <span className="num opacity-70">{plans.length}</span>
          </FilterChip>
          {ministries.map(([m, n]) => (
            <FilterChip key={m} active={ministry === m} onClick={() => setMinistry(m)}>
              {m} <span className="num opacity-70">{n}</span>
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 일괄 내려받기 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-tint px-3 py-2.5">
        <ArchiveIcon className="size-4 shrink-0 text-brand" />
        <span className="text-xs">
          <strong className="num">{filtered.length}</strong>건 표시 · 원문{" "}
          <strong className="num">{shownWithDoc}</strong>건
          {picked.size > 0 && (
            <>
              {" · 선택 "}
              <strong className="num text-brand">{picked.size}</strong>건
            </>
          )}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {picked.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())}>
                선택 해제
              </Button>
              <Button size="sm" nativeButton={false}
                render={<a href={`/api/plans/download?seq=${[...picked].join(",")}`} />}>
                <DownloadIcon /> 선택 {picked.size}건 ZIP
              </Button>
            </>
          )}
          <Button variant={picked.size > 0 ? "outline" : "default"} size="sm" nativeButton={false}
            render={<a href={pickAllHref} />}>
            <DownloadIcon /> {ministry === "all" && !q && !onlyDoc ? "전체" : "현재 목록"} {shownWithDoc}건 ZIP
          </Button>
        </div>
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        ZIP은 압축 없이 원문 그대로 담깁니다. 전체({totalWithDoc}건)는 약 1GB이므로 유선 환경에서 받으세요.
      </p>

      {/* 목록 */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[66rem] text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="w-9 px-2 py-2 text-left font-medium">
                <input
                  type="checkbox"
                  aria-label="표시된 원문 전체 선택"
                  className="size-3.5 accent-[var(--brand)]"
                  checked={shownWithDoc > 0 && picked.size === shownWithDoc}
                  onChange={(e) =>
                    setPicked(e.target.checked ? new Set(filtered.filter((x) => x.hasDoc).map((x) => x.seq)) : new Set())
                  }
                />
              </th>
              <th className="px-3 py-2 text-left font-medium">연번</th>
              <th className="px-3 py-2 text-left font-medium">계획명</th>
              <th className="px-3 py-2 text-left font-medium">근거법률</th>
              <th className="px-3 py-2 text-left font-medium">최신차수 · 계획기간</th>
              <th className="px-3 py-2 text-left font-medium">소관부처</th>
              <th className="px-3 py-2 text-left font-medium">주기</th>
              <th className="px-3 py-2 text-left font-medium">신뢰도</th>
              <th className="px-3 py-2 text-right font-medium">원문</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const conf = p.confidence ? CONF[p.confidence] : undefined;
              return (
                <tr key={p.id} className="border-t align-top hover:bg-muted/50">
                  <td className="px-2 py-2.5">
                    {p.hasDoc && (
                      <input
                        type="checkbox"
                        aria-label={`${p.name} 선택`}
                        className="size-3.5 accent-[var(--brand)]"
                        checked={picked.has(p.seq)}
                        onChange={() => toggle(p.seq)}
                      />
                    )}
                  </td>
                  <td className="num px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{p.seq}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{p.name}</div>
                    {p.remark && <div className="mt-0.5 text-[11px] text-muted-foreground">{p.remark}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {p.law}
                    {p.article && <span className="block opacity-75">{p.article}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {p.edition || <span className="text-muted-foreground">—</span>}
                    {p.period && <span className="num block text-muted-foreground">{p.period}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap">{p.ministry}</td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap text-muted-foreground">{p.cycle}</td>
                  <td className="px-3 py-2.5">
                    {conf && (
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: conf.bg, color: conf.color }}
                        title={conf.desc}
                      >
                        {p.confidence}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {p.hasDoc && p.docFile ? (
                      <Button variant="outline" size="sm" nativeButton={false}
                        render={
                          <a
                            href={p.docFile}
                            download
                            target="_blank"
                            rel="noreferrer"
                            title={decodeURIComponent(p.docFile.replace(/^\/plans\//, ""))}
                          />
                        }>
                        <DownloadIcon /> PDF
                        <span className="num ml-0.5 text-[10px] opacity-70">{fileSize(p.docSize)}</span>
                      </Button>
                    ) : p.sourceUrl ? (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand hover:underline"
                      >
                        출처 <ExternalLinkIcon className="size-3" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title="원문을 확보하지 못한 계획입니다">
                        <FileXIcon className="size-3.5" /> 미확보
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-3 py-14 text-center text-sm text-muted-foreground">조건에 맞는 계획이 없습니다.</p>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <FileTextIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          원문 PDF는 각 소관부처가 공표한 자료를 수집한 것입니다. 근거를 확인하지 못한 항목은 추정하지 않고
          「미확인」으로 두었습니다{orgName ? ` (${orgName})` : ""}.
        </span>
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? "border-brand bg-brand-tint font-medium text-brand" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
