import Link from "next/link";
import Image from "next/image";
import type { DashGoal } from "@/lib/data";
import { averageProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

/**
 * 17개 목표 그리드 — 지속가능발전포털의 공식 K-SDGs 심볼을 그대로 쓴다.
 *
 * 공식 심볼은 **변형하지 않는다**(색 변경·자르기·텍스트 덮어쓰기 금지).
 * 달성도 막대는 이미지 안이 아니라 아래 캡션 줄에 둔다.
 * 심볼 원본과 취급 규칙은 public/ksdgs/README.md 참고.
 */
export function GoalGrid({ goals, className }: { goals: DashGoal[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9", className)}>
      {goals.map((g) => {
        const avg = averageProgress(g.indicators.map((i) => i.computed));
        const src = `/ksdgs/goal-${String(g.no).padStart(2, "0")}.svg`;
        return (
          <li key={g.id}>
            <Link
              href={`/goals/${g.no}`}
              className="group block overflow-hidden rounded-lg border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <Image
                src={src}
                alt={`목표 ${g.no}. ${g.name}`}
                width={127}
                height={127}
                className="block aspect-square w-full"
                unoptimized
              />
              <div className="px-2 py-1.5">
                <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
                  <span className="num">지표 {g.indicators.length}</span>
                  <span className="num font-semibold" style={{ color: g.tone.text }}>
                    {avg === null ? "—" : `${Math.round(avg)}%`}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${Math.round(avg ?? 0)}%`, backgroundColor: g.color }}
                  />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
