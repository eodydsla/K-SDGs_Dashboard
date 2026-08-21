import type { DashIndicator } from "@/lib/data";
import { STATUSES, STATUS_META } from "@/lib/progress";
import { cn } from "@/lib/utils";

/** 소관부처별 지표 수 — 상태별로 쌓아 보여준다. 부처 담당자가 가장 먼저 찾는 화면. */
export function MinistryBars({ indicators, className }: { indicators: DashIndicator[]; className?: string }) {
  const byMinistry = new Map<string, DashIndicator[]>();
  for (const i of indicators) {
    const key = i.custodian?.trim() || "미지정";
    // "환경부·국토교통부" 처럼 공동 소관은 각 부처에 모두 계상한다
    for (const m of key.split("·").map((s) => s.trim()).filter(Boolean)) {
      const arr = byMinistry.get(m) ?? [];
      arr.push(i);
      byMinistry.set(m, arr);
    }
  }
  const rows = [...byMinistry.entries()].sort((a, b) => b[1].length - a[1].length);
  const max = rows[0]?.[1].length ?? 1;

  return (
    <ul className={cn("flex flex-col gap-1.5", className)}>
      {rows.map(([name, list]) => {
        const counts = STATUSES.map((s) => ({ s, n: list.filter((i) => i.computed.status === s).length })).filter((x) => x.n > 0);
        return (
          <li key={name} className="flex items-center gap-3 text-xs">
            <span className="w-32 shrink-0 truncate text-right sm:w-40" title={name}>{name}</span>
            <span className="flex h-4 flex-1 overflow-hidden rounded-sm bg-muted" style={{ maxWidth: `${(list.length / max) * 100}%` }}>
              {counts.map(({ s, n }) => (
                <span key={s} style={{ width: `${(n / list.length) * 100}%`, backgroundColor: STATUS_META[s].color }} title={`${s} ${n}개`} />
              ))}
            </span>
            <span className="num w-8 shrink-0 text-muted-foreground">{list.length}</span>
          </li>
        );
      })}
    </ul>
  );
}
