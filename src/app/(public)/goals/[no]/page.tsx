import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDashboard, findGoal } from "@/lib/data";
import { readablePair, bannerGradient } from "@/lib/colors";
import { STATUSES, STATUS_META, averageProgress, countByStatus } from "@/lib/progress";
import { Donut } from "@/components/donut";
import { StatusBadge } from "@/components/status-badge";
import { MilestoneBar } from "@/components/milestone-bar";
import { ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

export const dynamic = "force-dynamic";

/** 목표 상세 — K-SDGs에서 탐색의 기본 단위. 세부목표 트리와 지표 마일스톤을 함께 보여준다. */
export default async function GoalPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const dashboard = await getDashboard();
  const goal = findGoal(dashboard, no);
  if (!goal) notFound();

  const { config, goals } = dashboard;
  const computed = goal.indicators.map((i) => i.computed);
  const counts = countByStatus(computed);
  const avg = averageProgress(computed);
  const banner = bannerGradient(goal.color);
  const chip = readablePair(goal.color);

  const idx = goals.findIndex((g) => g.id === goal.id);
  const prev = goals[idx - 1] ?? null;
  const next = goals[idx + 1] ?? null;

  return (
    <div className="page flex flex-col gap-6 py-8">
      {/* 목표 헤더 */}
      <section
        className="relative overflow-hidden rounded-lg"
        style={{ background: `linear-gradient(135deg, ${banner.from} 0%, ${banner.to} 100%)`, color: banner.fg }}
      >
        {/* 은은한 무늬 — 단색 배너가 밋밋해 보이지 않게 */}
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 600 200">
          <defs>
            <pattern id="gh-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#fff" opacity="0.22" />
            </pattern>
            <radialGradient id="gh-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="200" fill="url(#gh-dots)" />
          <circle cx="510" cy="20" r="130" fill="url(#gh-glow)" />
          <path d="M0 150c90-26 150 18 240 4s150-34 240-16 90 10 120 4v58H0z" fill="#fff" opacity="0.07" />
          <path d="M0 172c100-22 160 16 250 2s160-26 230-10 90 8 120 2v34H0z" fill="#fff" opacity="0.06" />
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-6 p-6 sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            {/* 공식 심볼 */}
            <Image
              src={`/ksdgs/goal-${String(goal.no).padStart(2, "0")}.svg`}
              alt=""
              width={127}
              height={127}
              unoptimized
              className="hidden size-20 shrink-0 rounded-md shadow-sm sm:block"
            />
            <div className="min-w-0">
              <div className="text-xs font-medium opacity-80">
                {goal.trackCode && <Link href={`/areas/${goal.trackCode}`} className="underline underline-offset-2">{config.level0_label}</Link>}
                {" · "}{config.level1_label} {goal.no}
              </div>
              <h1 className="mt-1 text-2xl leading-tight font-bold sm:text-3xl">{goal.name}</h1>
              {goal.description && <p className="mt-2 max-w-2xl text-sm opacity-85">{goal.description}</p>}
            </div>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-xs opacity-80">{config.level2_label}</div>
              <div className="num text-3xl leading-none font-bold">{goal.targets.length}</div>
            </div>
            <div>
              <div className="text-xs opacity-80">{config.level3_label}</div>
              <div className="num text-3xl leading-none font-bold">{goal.indicators.length}</div>
            </div>
            <div>
              <div className="text-xs opacity-80">평균 달성도</div>
              <div className="num text-3xl leading-none font-bold">{avg === null ? "—" : `${Math.round(avg)}%`}</div>
            </div>
          </div>
        </div>
        {/* 상태 분포 띠 */}
        <div className="relative flex h-2 w-full bg-black/25">
          {STATUSES.filter((s) => counts[s] > 0).map((s) => (
            <div
              key={s}
              style={{ width: `${(counts[s] / goal.indicators.length) * 100}%`, backgroundColor: STATUS_META[s].color }}
              title={`${s} ${counts[s]}개`}
            />
          ))}
        </div>
      </section>

      {/* 상태 요약 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-3">
        <Donut value={avg} color={goal.color} label="평균 달성" />
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {STATUSES.filter((s) => counts[s] > 0).map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
              <span className="text-muted-foreground">{s}</span>
              <strong className="num">{counts[s]}</strong>
            </li>
          ))}
        </ul>
        <Link
          href={`/indicators?goal=${goal.id}`}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand hover:gap-2"
          style={{ transition: "gap 150ms" }}
        >
          이 {config.level1_label}의 {config.level3_label} 탐색 <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      {/* 세부목표 → 지표 */}
      <section className="flex flex-col gap-4">
        {goal.targets.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-4 py-3" style={{ backgroundColor: goal.tone.tint }}>
              <span className="num rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: chip.bg, color: chip.fg }}>
                {t.code}
              </span>
              <h2 className="min-w-0 flex-1 text-sm leading-snug font-semibold" style={{ color: goal.tone.deep }}>
                {t.name}
              </h2>
              <span className="num text-[11px] text-muted-foreground">
                {config.level3_label} {t.indicators.length}
              </span>
            </div>
            {t.indicators.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-muted-foreground">등록된 {config.level3_label}가 없습니다.</p>
            ) : (
              <ul className="divide-y">
                {t.indicators.map((i) => (
                  <li key={i.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="num text-[11px] text-muted-foreground">{i.code}</span>
                      <Link href={`/indicators?indicator=${i.id}`} className="min-w-0 flex-1 text-sm font-medium hover:underline">
                        {i.name}
                      </Link>
                      {i.kind && i.kind !== "정량" && (
                        <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">{i.kind}</span>
                      )}
                      <StatusBadge status={i.computed.status} size="sm" />
                    </div>
                    <MilestoneBar indicator={i} className="mt-2" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* 이전·다음 목표 */}
      <nav className="flex items-center justify-between gap-3 border-t pt-4 text-sm">
        {prev ? (
          <Link href={`/goals/${prev.no}`} className="inline-flex min-w-0 items-center gap-2 hover:underline">
            <ArrowLeftIcon className="size-4 shrink-0" />
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: prev.color }} />
            <span className="truncate">{prev.no}. {prev.name}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/goals/${next.no}`} className="inline-flex min-w-0 items-center gap-2 text-right hover:underline">
            <span className="truncate">{next.no}. {next.name}</span>
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: next.color }} />
            <ChevronRightIcon className="size-4 shrink-0" />
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
