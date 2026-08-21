"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MATCH } from "@/lib/futures-meta";
import { SearchIcon, XIcon, ExternalLinkIcon, ChevronRightIcon, Share2Icon, ListIcon } from "lucide-react";

interface TargetNode {
  code: string; name: string; goalNo: number; goalName: string; color: string;
  indicators: { code: string; name: string }[];
}
interface LinkNode { code: string; match: string; name: string; scenario: string; scenarioCode: string }
export interface StatNode {
  code: string; name: string; org: string | null; portal: string | null; freq: string | null;
  note: string | null; url: string | null; goals: number[];
  targets: TargetNode[]; unmatchedTargets: string[]; links: LinkNode[];
}
interface Goal { no: number; name: string; color: string }

/**
 * 전망 데이터 출처 지도 — 통계를 가운데 두고 K-SDGs 쪽(세부목표·지표)과 전망 쪽(시나리오 지표)으로
 * 가지를 뻗는 마인드맵. 노드가 54×N개라 물리 시뮬레이션 대신 **결정적 방사형 배치**를 쓴다.
 * 매번 같은 자리에 그려져야 어제 본 그림과 오늘 본 그림을 비교할 수 있다.
 */
export function SourceMap({
  nodes, goals, level2Label, level3Label,
}: {
  nodes: StatNode[]; goals: Goal[]; level2Label: string; level3Label: string;
}) {
  const [q, setQ] = useState("");
  const [goalFilter, setGoalFilter] = useState<number | "all">("all");
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return nodes.filter((n) => {
      if (goalFilter !== "all" && !n.goals.includes(goalFilter) && !n.targets.some((t) => t.goalNo === goalFilter)) return false;
      if (kw) {
        const hay = `${n.code} ${n.name} ${n.org ?? ""} ${n.portal ?? ""} ${n.targets.map((t) => t.name).join(" ")} ${n.links.map((l) => l.name).join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [nodes, q, goalFilter]);

  const current = active ? nodes.find((n) => n.code === active) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      {/* 조작부 */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="통계명·기관·세부목표로 검색" className="pl-9" />
            {q && (
              <button onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="지우기">
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex rounded-lg border p-0.5">
            <button onClick={() => setView("map")} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs", view === "map" ? "bg-brand text-white" : "text-muted-foreground")}>
              <Share2Icon className="size-3.5" /> 맵
            </button>
            <button onClick={() => setView("list")} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs", view === "list" ? "bg-brand text-white" : "text-muted-foreground")}>
              <ListIcon className="size-3.5" /> 목록
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setGoalFilter("all")}
            className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", goalFilter === "all" ? "border-brand bg-brand-tint font-medium text-brand" : "text-muted-foreground hover:text-foreground")}
          >
            전체 <span className="num opacity-70">{nodes.length}</span>
          </button>
          {goals.map((g) => {
            const n = nodes.filter((x) => x.goals.includes(g.no) || x.targets.some((t) => t.goalNo === g.no)).length;
            if (!n) return null;
            return (
              <button
                key={g.no}
                onClick={() => setGoalFilter(goalFilter === g.no ? "all" : g.no)}
                title={g.name}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors",
                  goalFilter === g.no ? "border-brand bg-brand-tint text-brand" : "text-muted-foreground hover:text-foreground")}
              >
                <span className="num inline-grid size-4 place-items-center rounded-[3px] text-[9px] font-bold text-white" style={{ backgroundColor: g.color }}>{g.no}</span>
                <span className="num opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          <strong className="num text-foreground">{filtered.length}</strong>종 표시
          {view === "map" && " · 통계를 누르면 연결이 펼쳐집니다"}
        </p>
      </div>

      {view === "map" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <MapCanvas nodes={filtered} active={active} onPick={setActive} />
          <DetailPanel node={current} level2Label={level2Label} level3Label={level3Label} onClose={() => setActive(null)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <li key={n.code}>
              <button
                onClick={() => { setActive(n.code); setView("map"); }}
                className="flex h-full w-full flex-col gap-1.5 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/25"
              >
                <div className="num text-[10px] text-muted-foreground">{n.code}</div>
                <div className="text-sm font-semibold">{n.name}</div>
                <div className="text-[11px] text-muted-foreground">{n.org}{n.portal ? ` · ${n.portal}` : ""}{n.freq ? ` · ${n.freq}` : ""}</div>
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {n.goals.map((no) => {
                    const g = goals.find((x) => x.no === no);
                    return g ? (
                      <span key={no} className="num inline-grid size-4 place-items-center rounded-[3px] text-[9px] font-bold text-white" style={{ backgroundColor: g.color }} title={g.name}>{no}</span>
                    ) : null;
                  })}
                  <span className="num ml-auto text-[10px] text-muted-foreground">
                    {level2Label} {n.targets.length} · 전망 {n.links.length}
                  </span>
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="col-span-full py-16 text-center text-sm text-muted-foreground">조건에 맞는 통계가 없습니다.</li>}
        </ul>
      )}
    </div>
  );
}

/** 방사형 배치 — 각도는 인덱스로 결정되므로 항상 같은 그림이 나온다 */
function MapCanvas({ nodes, active, onPick }: { nodes: StatNode[]; active: string | null; onPick: (c: string) => void }) {
  const W = 760, H = 620, cx = W / 2, cy = H / 2;
  const n = nodes.length || 1;
  // 개수에 따라 한 겹/두 겹으로 나눠 겹치지 않게 한다
  const rings = n > 22 ? 2 : 1;

  const placed = nodes.map((s, i) => {
    const ring = rings === 1 ? 0 : i % 2;
    const inRing = rings === 1 ? n : Math.ceil(n / 2);
    const idx = rings === 1 ? i : Math.floor(i / 2);
    const r = rings === 1 ? 232 : ring === 0 ? 168 : 262;
    const a = (idx / inRing) * Math.PI * 2 - Math.PI / 2 + (ring ? Math.PI / inRing : 0);
    return { s, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a };
  });

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[42rem]">
        {/* 간선 */}
        {placed.map(({ s, x, y }) => {
          const on = active === s.code;
          return (
            <line
              key={s.code}
              x1={cx} y1={cy} x2={x} y2={y}
              stroke={on ? "var(--brand)" : "var(--border)"}
              strokeWidth={on ? 2 : 1}
              opacity={active && !on ? 0.25 : 1}
            />
          );
        })}

        {/* 가운데 — K-SDGs */}
        <circle cx={cx} cy={cy} r={52} fill="var(--brand)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize={15} fontWeight={700}>K-SDGs</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="#fff" fontSize={10} opacity={0.85}>17 · 119 · 236</text>

        {/* 통계 노드 */}
        {placed.map(({ s, x, y }) => {
          const on = active === s.code;
          const dim = active && !on;
          const size = 9 + Math.min(9, s.targets.length + s.links.length / 2);
          return (
            <g key={s.code} className="cursor-pointer" onClick={() => onPick(s.code)} opacity={dim ? 0.35 : 1}>
              <circle cx={x} cy={y} r={size} fill={on ? "var(--brand)" : "var(--card)"} stroke={on ? "var(--brand)" : "var(--border)"} strokeWidth={2} />
              <text x={x} y={y + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill={on ? "#fff" : "var(--muted-foreground)"} className="num">
                {s.code.replace("ST", "")}
              </text>
              <title>{`${s.code} ${s.name}\n${s.org ?? ""}`}</title>
              {/* 바깥쪽으로 이름 */}
              <text
                x={x + (x > cx ? size + 5 : -(size + 5))}
                y={y + 3}
                textAnchor={x > cx ? "start" : "end"}
                fontSize={9.5}
                fill="var(--muted-foreground)"
              >
                {s.name.length > 16 ? s.name.slice(0, 16) + "…" : s.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DetailPanel({
  node, level2Label, level3Label, onClose,
}: { node: StatNode | null; level2Label: string; level3Label: string; onClose: () => void }) {
  if (!node) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        통계 노드를 누르면 어떤 {level2Label}·{level3Label}와 이어지는지 여기에 펼쳐집니다.
      </div>
    );
  }

  return (
    <aside className="flex max-h-[46rem] flex-col overflow-y-auto rounded-lg border bg-card">
      <div className="sticky top-0 border-b bg-card p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="num text-[10px] text-muted-foreground">{node.code}</div>
            <h3 className="text-sm leading-snug font-bold">{node.name}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {node.org}{node.portal ? ` · ${node.portal}` : ""}{node.freq ? ` · 갱신 ${node.freq}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="닫기">
            <XIcon className="size-4" />
          </button>
        </div>
        {node.url && (
          <a href={node.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-brand hover:underline">
            원자료 <ExternalLinkIcon className="size-3" />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4">
        {node.note && <p className="rounded-lg bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">{node.note}</p>}

        {/* K-SDGs 쪽 가지 */}
        <section>
          <h4 className="text-[11px] font-semibold text-muted-foreground">
            이 통계로 잴 수 있는 {level2Label} <span className="num">{node.targets.length}</span>
          </h4>
          {node.targets.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">연결된 {level2Label}가 없습니다.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {node.targets.map((t) => (
                <li key={t.code} className="rounded-lg border p-2.5">
                  <div className="flex items-start gap-2">
                    <Image src={`/ksdgs/goal-${String(t.goalNo).padStart(2, "0")}.svg`} alt="" width={127} height={127} unoptimized className="size-6 shrink-0 rounded-[3px]" />
                    <div className="min-w-0">
                      <Link href={`/goals/${t.goalNo}`} className="num text-[10px] text-muted-foreground hover:underline">{t.code}</Link>
                      <p className="text-[12px] leading-snug">{t.name}</p>
                    </div>
                  </div>
                  {t.indicators.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5 border-t pt-1.5">
                      {t.indicators.map((i) => (
                        <li key={i.code}>
                          <Link href={`/indicators?q=${encodeURIComponent(i.code)}`} className="flex items-start gap-1 text-[11px] text-muted-foreground hover:text-brand hover:underline">
                            <ChevronRightIcon className="mt-0.5 size-3 shrink-0" />
                            <span className="num shrink-0">{i.code}</span>
                            <span className="min-w-0 truncate">{i.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          {node.unmatchedTargets.length > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              현행 체계에서 찾지 못한 코드: <span className="num">{node.unmatchedTargets.join(", ")}</span>
            </p>
          )}
        </section>

        {/* 전망 쪽 가지 */}
        {node.links.length > 0 && (
          <section>
            <h4 className="text-[11px] font-semibold text-muted-foreground">
              이 통계에서 가져오는 전망 지표 <span className="num">{node.links.length}</span>
            </h4>
            <ul className="mt-2 flex flex-col gap-1">
              {node.links.map((l) => {
                const m = MATCH[l.match as keyof typeof MATCH];
                return (
                  <li key={l.code}>
                    <Link href={`/futures/${l.scenarioCode}`} className="flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] transition-colors hover:border-brand">
                      <span className="rounded px-1 py-0.5 text-[9px] font-medium text-white" style={{ backgroundColor: m?.color ?? "#999" }} title={m?.desc}>
                        {m?.label ?? l.match}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className="num shrink-0 text-muted-foreground">{l.code}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
