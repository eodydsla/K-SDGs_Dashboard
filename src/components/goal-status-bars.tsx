import Link from "next/link";
import Image from "next/image";
import type { DashGoal } from "@/lib/data";
import { STATUSES, STATUS_META, averageProgress, countByStatus } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * 목표별 이행 상태 막대.
 *
 * 처음에는 지표 하나를 작은 네모 한 칸으로 그리는 매트릭스였는데,
 * 236칸이 격자로 깔리니 스프레드시트처럼 보이고 목표 간 비교도 되지 않았다.
 * 목표마다 100% 누적 막대 하나로 바꾸면 "어느 목표가 밀려 있나"가 바로 읽힌다.
 */
export function GoalStatusBars({
  goals,
  limit,
  className,
}: {
  goals: DashGoal[];
  /** 지정하면 달성도가 낮은 순으로 이만큼만 보여준다 (메인 화면용 요약) */
  limit?: number;
  className?: string;
}) {
  const shown = limit
    ? [...goals]
        .sort((a, b) => (averageProgress(a.indicators.map((i) => i.computed)) ?? 101) - (averageProgress(b.indicators.map((i) => i.computed)) ?? 101))
        .slice(0, limit)
    : goals;

  return (
    <ul className={cn("grid gap-x-10 gap-y-1", limit ? "" : "lg:grid-cols-2", className)}>
      {shown.map((g) => {
        const c = g.indicators.map((i) => i.computed);
        const counts = countByStatus(c);
        const total = c.length || 1;
        const avg = averageProgress(c);
        return (
          <li key={g.id}>
            <Link
              href={`/goals/${g.no}`}
              className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
            >
              <Image
                src={`/ksdgs/goal-${String(g.no).padStart(2, "0")}.svg`}
                alt=""
                width={127}
                height={127}
                unoptimized
                className="size-7 shrink-0 rounded"
              />
              <span className="w-[7.5rem] shrink-0 truncate text-[13px] group-hover:underline sm:w-[10rem]">
                {g.name}
              </span>

              <span className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                {STATUSES.filter((s) => counts[s] > 0).map((s) => (
                  <span
                    key={s}
                    style={{ width: `${(counts[s] / total) * 100}%`, backgroundColor: STATUS_META[s].color }}
                    title={`${s} ${counts[s]}개`}
                  />
                ))}
              </span>

              <span className="num w-9 shrink-0 text-right text-[11px] font-semibold" style={{ color: g.tone.text }}>
                {avg === null ? "—" : `${Math.round(avg)}%`}
              </span>
              <span className="num w-6 shrink-0 text-right text-[11px] text-muted-foreground">{c.length}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
