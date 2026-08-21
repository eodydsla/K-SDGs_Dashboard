import Link from "next/link";
import { getDashboard } from "@/lib/data";
import { onColor } from "@/lib/colors";
import { GoalGrid } from "@/components/goal-grid";
import { GoalStatusBars } from "@/components/goal-status-bars";
import { averageProgress, countByStatus, STATUSES, STATUS_META } from "@/lib/progress";

export const dynamic = "force-dynamic";

/** 17개 목표 전체 — 부문(Ⅰ~Ⅳ)으로 묶어 보여준다. */
export default async function GoalsPage() {
  const { tracks, goals, config } = await getDashboard();

  return (
    <div className="page flex flex-col gap-section py-8">
      <div>
        <h1 className="text-2xl font-bold">국가지속가능발전목표(K-SDGs)</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {config.framework_name}은 17개 {config.level1_label}, {goals.reduce((n, g) => n + g.targets.length, 0)}개{" "}
          {config.level2_label}, {goals.reduce((n, g) => n + g.indicators.length, 0)}개 {config.level3_label}로 구성됩니다.
          {config.level1_label}는 계획 2부의 {config.level0_label} Ⅰ~Ⅳ로 묶여 있습니다.
        </p>
      </div>

      <GoalGrid goals={goals} />

      {/* 17개 목표 이행 상태 한눈에 */}
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 className="text-sm font-bold">{config.level1_label}별 이행 상태</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {STATUSES.map((st) => (
              <span key={st} className="inline-flex items-center gap-1" title={STATUS_META[st].desc}>
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[st].color }} />
                <span className="text-muted-foreground">{st}</span>
              </span>
            ))}
          </div>
        </div>
        <GoalStatusBars goals={goals} />
      </section>

      {tracks.map((t) => {
        const c = t.indicators.map((i) => i.computed);
        const tc = countByStatus(c);
        const avg = averageProgress(c);
        return (
          <section key={t.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2">
              <h2 className="text-lg font-bold">
                <span className="mr-2">{t.icon}</span>
                {t.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{config.level3_label} <strong className="num text-foreground">{c.length}</strong></span>
                <span>평균 달성도 <strong className="num text-foreground">{avg === null ? "—" : `${Math.round(avg)}%`}</strong></span>
                <Link href={`/areas/${t.code}`} className="font-medium text-brand hover:underline">{config.level0_label} 상세 →</Link>
              </div>
            </div>
            <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {STATUSES.filter((s) => tc[s] > 0).map((s) => (
                <div key={s} style={{ width: `${(tc[s] / c.length) * 100}%`, backgroundColor: STATUS_META[s].color }} title={`${s} ${tc[s]}개`} />
              ))}
            </div>

            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {t.goals.map((g) => {
                const gAvg = averageProgress(g.indicators.map((i) => i.computed));
                return (
                  <li key={g.id}>
                    <Link
                      href={`/goals/${g.no}`}
                      className="flex h-full gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/25"
                    >
                      <span
                        className="num grid size-10 shrink-0 place-items-center rounded text-base font-bold"
                        style={{ backgroundColor: g.color, color: onColor(g.color) }}
                      >
                        {g.no}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm leading-snug font-semibold">{g.name}</h3>
                        <p className="num mt-1.5 text-xs text-muted-foreground">
                          {config.level2_label} {g.targets.length} · {config.level3_label} {g.indicators.length} · 달성도{" "}
                          {gAvg === null ? "—" : `${Math.round(gAvg)}%`}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
