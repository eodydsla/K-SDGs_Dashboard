import Link from "next/link";
import { cn } from "@/lib/utils";

interface Impact {
  goal: number | null;
  secondary: number[];
  kind: string;
  direction: string | null;
  strength: string | null;
  name: string;
}
interface Row { code: string; title: string; axis: string; axisColor: string; impacts: Impact[] }
interface Goal { no: number; name: string; color: string }

/** 영향 세기 → 칸의 진하기. 직접 영향은 테두리로 한 번 더 구분한다. */
const ALPHA: Record<string, number> = { strong: 0.95, medium: 0.62, weak: 0.34 };

/**
 * 시나리오 × 17개 목표 영향 매트릭스.
 *
 * 색은 방향(초록=SDG에 유리 / 빨강=불리 / 회색=혼재)이고, 진하기는 영향의 세기다.
 * 한 칸에 여러 지표가 걸리면 가장 센 것을 대표로 칠하고 개수를 함께 적는다.
 * 시나리오끼리 영향을 **합산하지 않는다** — 시나리오들이 서로 독립이 아니기 때문이다.
 */
export function ImpactMatrix({ scenarios, goals, className }: { scenarios: Row[]; goals: Goal[]; className?: string }) {
  const cell = (r: Row, goalNo: number) => {
    const hits = r.impacts.filter((i) => i.goal === goalNo || i.secondary.includes(goalNo));
    if (!hits.length) return null;
    const primary = hits.filter((h) => h.goal === goalNo);
    const rank = (s: string | null) => (s === "strong" ? 3 : s === "medium" ? 2 : 1);
    const top = [...hits].sort((a, b) => rank(b.strength) - rank(a.strength))[0];
    return { hits, isDirect: primary.some((p) => p.kind === "direct"), top, count: hits.length };
  };

  const color = (dir: string | null, strength: string | null) => {
    const a = ALPHA[strength ?? "weak"] ?? 0.34;
    if (dir === "positive") return `rgba(22,127,90,${a})`;
    if (dir === "negative") return `rgba(201,59,58,${a})`;
    return `rgba(134,142,150,${a})`;
  };

  return (
    <div className={cn("overflow-x-auto rounded-lg border bg-card", className)}>
      <table className="w-full min-w-[54rem] border-separate border-spacing-[2px] p-3 text-xs">
        <thead>
          <tr>
            <th className="w-52 text-left" />
            {goals.map((g) => (
              <th key={g.no} className="w-8 pb-1 align-bottom" title={`${g.no}. ${g.name}`}>
                <span
                  className="num mx-auto grid size-6 place-items-center rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: g.color }}
                >
                  {g.no}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.map((r) => (
            <tr key={r.code}>
              <th className="pr-3 text-left font-medium">
                <Link href={`/futures/${r.code}`} className="flex items-center gap-2 hover:underline">
                  <span className="h-5 w-[3px] shrink-0 rounded" style={{ backgroundColor: r.axisColor }} />
                  <span className="num text-[10px] text-muted-foreground">{r.code}</span>
                  <span className="truncate">{r.title}</span>
                </Link>
              </th>
              {goals.map((g) => {
                const c = cell(r, g.no);
                return (
                  <td key={g.no} className="h-7">
                    {c ? (
                      <Link
                        href={`/futures/${r.code}`}
                        className="relative block size-full min-h-7 rounded-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: color(c.top.direction, c.top.strength) }}
                        title={`${r.title} → 목표 ${g.no} · ${c.count}개 지표${c.isDirect ? " (직접)" : ""}\n${c.hits.map((h) => h.name).join(", ")}`}
                      >
                        {c.isDirect && <span className="absolute inset-[2px] rounded-[2px] border-[1.5px] border-white/85" />}
                      </Link>
                    ) : (
                      <span className="block size-full min-h-7 rounded-sm bg-muted" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: "rgba(22,127,90,0.95)" }} /> 목표 달성에 유리
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: "rgba(201,59,58,0.95)" }} /> 불리
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: "rgba(134,142,150,0.62)" }} /> 혼재·중립
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="relative size-3 rounded-sm bg-foreground/25">
            <span className="absolute inset-[2px] rounded-[1px] border border-white/85" />
          </span>
          직접 영향
        </span>
        <span>진하기 = 영향의 세기</span>
        <span className="ml-auto">시나리오는 서로 독립이 아니므로 칸을 합산해 읽지 마세요.</span>
      </div>
    </div>
  );
}
