"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BADGES, type SeriesPoint } from "@/lib/futures-meta";

interface Alt { name: string; points: { y: number; v: number }[] }

/**
 * 시나리오 전망 시계열 — 손으로 그린 SVG.
 *
 * recharts를 쓰지 않은 이유: 점마다 출처 배지(R/S/E/B)가 달라서 **점 하나하나를 다른 색으로**
 * 칠해야 하는데, 그 표현이 이 화면의 핵심이다. 추정값(E)이 공식 전망(R)과 같은 점으로
 * 보이면 안 된다. 라이브러리로 우회하는 것보다 직접 그리는 편이 짧고 정확하다.
 */
export function SeriesChart({
  series,
  alts = [],
  unit,
  color,
  seriesName,
  className,
}: {
  series: SeriesPoint[];
  alts?: Alt[];
  unit?: string | null;
  color: string;
  seriesName?: string | null;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (series.length < 2) {
    return (
      <p className={cn("rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground", className)}>
        시계열이 2개 미만이라 추이를 그릴 수 없습니다.
      </p>
    );
  }

  const W = 640, H = 240;
  const P = { t: 16, r: 16, b: 26, l: 48 };

  const all = [...series.map((p) => ({ y: p.y, v: p.v })), ...alts.flatMap((a) => a.points)];
  const xs = all.map((p) => p.y);
  const vs = all.map((p) => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let v0 = Math.min(...vs), v1 = Math.max(...vs);
  const pad = (v1 - v0) * 0.12 || Math.abs(v1) * 0.12 || 1;
  v0 -= pad; v1 += pad;

  const X = (y: number) => P.l + ((y - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - v0) / (v1 - v0 || 1)) * (H - P.t - P.b);
  const path = (pts: { y: number; v: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${X(p.y).toFixed(1)} ${Y(p.v).toFixed(1)}`).join("");

  const fmt = (n: number) =>
    Math.abs(n) >= 1000 ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 })
      : n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => v0 + ((v1 - v0) / ticks) * i);

  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible">
        {/* 눈금선 */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={P.l - 7} y={Y(v) + 3.5} textAnchor="end" className="num" fontSize={9.5} fill="var(--muted-foreground)">
              {fmt(v)}
            </text>
          </g>
        ))}
        {/* 연도 축 */}
        {series.map((p) => (
          <text key={p.y} x={X(p.y)} y={H - P.b + 14} textAnchor="middle" className="num" fontSize={9.5} fill="var(--muted-foreground)">
            {p.y}
          </text>
        ))}

        {/* 대안 시나리오 — 옅은 점선 */}
        {alts.map((a, i) => (
          <path key={i} d={path(a.points)} fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.42} />
        ))}

        {/* 기본 시계열 */}
        <path d={path(series.map((p) => ({ y: p.y, v: p.v })))} fill="none" stroke={color} strokeWidth={2.2} />

        {/* 점 — 출처 배지 색으로 칠한다 */}
        {series.map((p, i) => {
          const b = BADGES[(p.b ?? "R") as keyof typeof BADGES];
          return (
            <g key={p.y} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={X(p.y)} cy={Y(p.v)} r={hover === i ? 6 : 4} fill={b?.color ?? color} stroke="var(--card)" strokeWidth={1.6} />
              <circle cx={X(p.y)} cy={Y(p.v)} r={12} fill="transparent" />
            </g>
          );
        })}
      </svg>

      {/* 값 표시 */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {seriesName && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2.5px] w-4 rounded" style={{ backgroundColor: color }} /> {seriesName}
          </span>
        )}
        {alts.map((a) => (
          <span key={a.name} className="inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color, opacity: 0.6 }} /> {a.name}
          </span>
        ))}
        {hover !== null && (
          <span className="num ml-auto font-semibold text-foreground">
            {series[hover].y}년 · {fmt(series[hover].v)}{unit ? ` ${unit}` : ""}
            {series[hover].b && (
              <span
                className="ml-1.5 rounded px-1 py-0.5 text-[10px] text-white"
                style={{ backgroundColor: BADGES[series[hover].b as keyof typeof BADGES]?.color }}
                title={BADGES[series[hover].b as keyof typeof BADGES]?.desc}
              >
                {series[hover].b}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
