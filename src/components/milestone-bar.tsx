import { cn } from "@/lib/utils";
import type { DashIndicator } from "@/lib/data";
import { STATUS_META, formatValue } from "@/lib/progress";

/**
 * 마일스톤 바 — 이 대시보드의 기본 지표 시각화.
 *
 * 제4차 기본계획 데이터는 연도별 시계열이 아니라 기준값 · 2030 · 2040 세 점이다.
 * 꺾은선을 기본으로 두면 점 두세 개짜리 빈 차트가 되므로, 목표 대비 위치를 보여주는
 * 불릿 차트를 기본으로 쓴다.
 *
 * 236개 중 97개는 목표가 "지속 감소"·"안정적 유지" 같은 서술형이라 수치 축에 얹을 수 없다.
 * 이 경우 막대 대신 칩 체인으로 렌더한다 — 숫자 자리를 "—"로 비워두면 자료 누락처럼 보인다.
 */
export function MilestoneBar({
  indicator: i,
  className,
}: {
  indicator: DashIndicator;
  className?: string;
}) {
  const { baselineYear, baselineValue, targetYear, targetValue, longYear, longValue, targetLabel, longLabel, unit, color } = i;
  const latest = i.computed.latest;
  const u = unit ? ` ${unit}` : "";

  const numeric = baselineValue !== null && targetValue !== null && targetValue !== baselineValue;

  // ── 서술형 목표: 칩 체인 ────────────────────────────────
  if (!numeric) {
    const chips: { label: string; value: string; strong?: boolean }[] = [];
    if (baselineValue !== null) chips.push({ label: `${baselineYear ?? "기준"}`, value: `${formatValue(baselineValue)}${u}`, strong: true });
    if (targetLabel) chips.push({ label: `${targetYear ?? 2030}`, value: targetLabel });
    if (longLabel && longLabel !== targetLabel) chips.push({ label: `${longYear ?? 2040}`, value: longLabel });

    if (!chips.length) {
      return <p className={cn("text-[11px] text-muted-foreground", className)}>원문에 수치·목표가 제시되지 않은 지표입니다.</p>;
    }
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {chips.map((c, n) => (
          <span key={n} className="contents">
            {n > 0 && <span className="text-[10px] text-muted-foreground">→</span>}
            <span
              className="inline-flex items-baseline gap-1 rounded border px-1.5 py-0.5 text-[11px]"
              style={n === 0 ? { borderColor: i.tone.border, backgroundColor: i.tone.tint } : undefined}
            >
              <span className="num text-[10px] text-muted-foreground">{c.label}</span>
              <span className={cn(c.strong && "font-semibold")}>{c.value}</span>
            </span>
          </span>
        ))}
      </div>
    );
  }

  // ── 수치 목표: 불릿 차트 ────────────────────────────────
  // 기준값·목표값·장기목표·최신값을 모두 담는 축을 만들고 여유를 8% 준다.
  const pts = [baselineValue, targetValue, longValue, latest?.value].filter((v): v is number => v !== null && v !== undefined);
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.08 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const pos = (v: number) => ((v - min) / (max - min)) * 100;

  const status = i.computed.status;
  const isBad = status === "지연" || status === "악화";
  const fill = isBad ? STATUS_META[status].color : color;

  const from = pos(baselineValue!);
  const to = pos(latest?.value ?? baselineValue!);
  const left = Math.min(from, to);
  const width = Math.abs(to - from);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-6 w-full">
        {/* 축 */}
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted" />
        {/* 기준값 → 최신값 진행 구간 */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${left}%`, width: `${width}%`, background: `linear-gradient(90deg, ${fill}99, ${fill})` }}
        />
        {/* 기준값 */}
        <Marker at={from} title={`기준 ${baselineYear ?? ""} ${formatValue(baselineValue)}${u}`}>
          <span className="block size-2 rounded-full border-2 border-background" style={{ backgroundColor: "var(--muted-foreground)" }} />
        </Marker>
        {/* 2030 목표 */}
        <Marker at={pos(targetValue!)} title={`${targetYear ?? 2030} 목표 ${targetLabel ?? formatValue(targetValue) + u}`}>
          <span className="block h-4 w-0.5 rounded-full" style={{ backgroundColor: color }} />
        </Marker>
        {/* 2040 장기목표 */}
        {longValue !== null && (
          <Marker at={pos(longValue)} title={`${longYear ?? 2040} 장기목표 ${longLabel ?? formatValue(longValue) + u}`}>
            <span className="block h-3 w-0.5 rounded-full opacity-45" style={{ backgroundColor: color }} />
          </Marker>
        )}
        {/* 최신 실적 */}
        {latest && (
          <Marker at={to} title={`${latest.year} 실적 ${formatValue(latest.value)}${u}`}>
            <span className="block size-3 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: fill }} />
          </Marker>
        )}
      </div>
      {/* 축 라벨 */}
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span className="num">기준 {baselineYear} {formatValue(baselineValue)}{u}</span>
        <span className="num">
          {targetYear ?? 2030} 목표 {formatValue(targetValue)}{u}
          {longValue !== null && <span className="opacity-60"> · {longYear ?? 2040} {formatValue(longValue)}{u}</span>}
        </span>
      </div>
    </div>
  );
}

function Marker({ at, title, children }: { at: number; title: string; children: React.ReactNode }) {
  return (
    <span
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${Math.max(0, Math.min(100, at))}%` }}
      title={title}
    >
      {children}
    </span>
  );
}
