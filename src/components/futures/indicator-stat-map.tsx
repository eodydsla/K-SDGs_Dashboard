"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MATCH } from "@/lib/futures-meta";
import { STATUS_META, type Status } from "@/lib/progress";
import type { MapGoal } from "@/lib/futures";
import { SearchIcon, XIcon, ExternalLinkIcon, CircleAlertIcon } from "lucide-react";

/**
 * 지표 중심 데이터맵.
 *
 * 목표 → 세부목표 → 지표 → 통계를 왼쪽에서 오른쪽으로 뻗는 가지로 그린다.
 * 노드가 236×N개라 전부 한 화면에 펼치면 읽히지 않으므로, 목표를 하나 고르면
 * 그 안쪽만 펼쳐지는 방식이다. 검색은 전체를 가로질러 걸린다.
 */
export function IndicatorStatMap({
  goals, level3Label,
}: {
  goals: MapGoal[]; level3Label: string;
}) {
  const [goalNo, setGoalNo] = useState<number>(goals[0]?.no ?? 1);
  const [q, setQ] = useState("");
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);

  const searching = q.trim().length > 0;
  const kw = q.trim().toLowerCase();

  /** 검색 중이면 전체 목표를 가로질러 찾고, 아니면 선택한 목표만 편다 */
  const visible = useMemo(() => {
    const src = searching ? goals : goals.filter((g) => g.no === goalNo);
    return src
      .map((g) => ({
        ...g,
        targets: g.targets
          .map((t) => ({
            ...t,
            indicators: t.indicators.filter((i) => {
              if (onlyUnlinked && i.stats.length > 0) return false;
              if (!kw) return true;
              return `${i.code} ${i.name} ${t.code} ${t.name} ${i.stats.map((s) => s.name + s.org).join(" ")}`
                .toLowerCase().includes(kw);
            }),
          }))
          .filter((t) => t.indicators.length > 0),
      }))
      .filter((g) => g.targets.length > 0);
  }, [goals, goalNo, kw, searching, onlyUnlinked]);

  return (
    <div className="flex flex-col gap-4">
      {/* 조작부 */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${level3Label}명·통계명으로 전체 검색`} className="pl-9" />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="지우기">
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            통계 없는 지표만
          </label>
        </div>

        {/* 목표 선택 — 공식 심볼 */}
        <div className={cn("flex flex-wrap gap-1.5", searching && "opacity-40")}>
          {goals.map((g) => (
            <button
              key={g.no}
              onClick={() => { setGoalNo(g.no); setQ(""); }}
              title={`${g.no}. ${g.name} — ${level3Label} ${g.indicatorCount}, 통계 연결 ${g.linkedCount}`}
              className={cn(
                "relative rounded-md p-0.5 transition-all",
                !searching && goalNo === g.no ? "ring-2 ring-brand ring-offset-1" : "opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={`/ksdgs/goal-${String(g.no).padStart(2, "0")}.svg`}
                alt={`목표 ${g.no}`} width={127} height={127} unoptimized
                className="size-9 rounded"
              />
              {g.linkedCount < g.indicatorCount && (
                <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-amber-500 text-[8px] font-bold text-white"
                      title={`${g.indicatorCount - g.linkedCount}개 지표에 연결된 통계가 없습니다`}>
                  !
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {searching
            ? <>전체 {level1Or(goals.length)}에서 검색 중 — <strong className="num text-foreground">{count(visible)}</strong>개 {level3Label}</>
            : <>{level3Label} <strong className="num text-foreground">{count(visible)}</strong> · 통계 연결{" "}
                <strong className="num text-foreground">{goals.find((g) => g.no === goalNo)?.linkedCount ?? 0}</strong></>}
        </p>
      </div>

      {/* 지도 */}
      <div className="flex flex-col gap-5">
        {visible.map((g) => (
          <section key={g.no} className="overflow-hidden rounded-lg border bg-card">
            <header className="flex items-center gap-3 border-b px-4 py-3" style={{ backgroundColor: `${g.color}12` }}>
              <Image src={`/ksdgs/goal-${String(g.no).padStart(2, "0")}.svg`} alt="" width={127} height={127} unoptimized className="size-9 shrink-0 rounded" />
              <div className="min-w-0 flex-1">
                <Link href={`/goals/${g.no}`} className="text-sm font-bold hover:underline">{g.no}. {g.name}</Link>
                <p className="num text-[11px] text-muted-foreground">
                  {level3Label} {g.indicatorCount} · 통계 연결 {g.linkedCount} · 통계 {g.statCount}종
                </p>
              </div>
            </header>

            <div className="flex flex-col divide-y">
              {g.targets.map((t) => (
                <div key={t.code} className="px-4 py-3">
                  {/* 세부목표 */}
                  <div className="flex items-baseline gap-2">
                    <span className="num shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: g.color }}>{t.code}</span>
                    <h3 className="text-[13px] leading-snug font-semibold">{t.name}</h3>
                  </div>

                  {/* 지표 → 통계 */}
                  <ul className="mt-2 flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: `${g.color}44` }}>
                    {t.indicators.map((ind) => (
                      <li key={ind.id} className="grid gap-2 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4">
                        {/* 지표 */}
                        <div className="min-w-0">
                          <Link href={`/indicators?indicator=${ind.id}`} className="group flex items-start gap-1.5">
                            <span
                              className="mt-1 size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: STATUS_META[ind.status as Status]?.color ?? "#ccc" }}
                              title={ind.status}
                            />
                            <span className="min-w-0">
                              <span className="num mr-1.5 text-[10px] text-muted-foreground">{ind.code}</span>
                              <span className="text-[13px] group-hover:underline">{ind.name}</span>
                              {ind.unit && <span className="ml-1 text-[10px] text-muted-foreground">({ind.unit})</span>}
                            </span>
                          </Link>
                        </div>

                        {/* 연관 통계 */}
                        {ind.stats.length === 0 ? (
                          <p className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-500">
                            <CircleAlertIcon className="size-3.5 shrink-0" />
                            연결된 통계를 찾지 못했습니다 — 관리자에서 직접 연결해야 합니다.
                          </p>
                        ) : (
                          <ul className="flex flex-wrap gap-1.5">
                            {ind.stats.map((s) => {
                              const m = MATCH[s.match as keyof typeof MATCH];
                              const title = [
                                s.name,
                                s.org, s.portal, s.freq,
                                m?.desc,
                                s.direct ? "클릭하면 실제 통계 화면(그래프·통계표)이 열립니다" : "통계 조회 화면으로 이동합니다",
                                s.hits.length ? `일치 키워드: ${s.hits.join(", ")}` : "",
                              ].filter(Boolean).join("\n");

                              return (
                                <li key={s.code}>
                                  <a
                                    href={s.url ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={title}
                                    className={cn(
                                      "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors hover:border-brand",
                                      s.direct ? "border-brand/40 bg-brand-tint" : "bg-muted/40",
                                    )}
                                  >
                                    <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium text-white" style={{ backgroundColor: m?.color ?? "#999" }}>
                                      {m?.label ?? s.match}
                                    </span>
                                    <span className="min-w-0 truncate">{s.name}</span>
                                    {s.source && s.direct && (
                                      <span className="shrink-0 rounded bg-brand px-1 text-[9px] text-white">{s.source}</span>
                                    )}
                                    {!s.direct && s.org && <span className="shrink-0 text-[10px] text-muted-foreground">{s.org}</span>}
                                    <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" />
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}

        {visible.length === 0 && (
          <p className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
            조건에 맞는 {level3Label}가 없습니다.
          </p>
        )}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-3 text-[11px] text-muted-foreground">
        {(Object.keys(MATCH) as (keyof typeof MATCH)[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5" title={MATCH[k].desc}>
            <span className="size-3 rounded-sm" style={{ backgroundColor: MATCH[k].color }} />
            {MATCH[k].label} — {MATCH[k].desc}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded border border-brand/40 bg-brand-tint px-1.5 py-0.5 text-[9px]">KOSIS 통계표</span>
          <span className="rounded border border-brand/40 bg-brand-tint px-1.5 py-0.5 text-[9px]">e-나라지표</span>
          클릭하면 통계표·그래프가 있는 실제 화면이 바로 열립니다 (전부 응답 확인)
        </span>
        <span>그 외 항목은 해당 통계 조회 화면으로 이동합니다. 연결은 자동 도출한 것이라 검수 전입니다.</span>
      </div>
    </div>
  );
}

const count = (gs: MapGoal[]) => gs.reduce((n, g) => n + g.targets.reduce((m, t) => m + t.indicators.length, 0), 0);
const level1Or = (n: number) => `${n}개 목표`;
