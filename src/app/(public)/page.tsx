import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getDashboard, type DashIndicator } from "@/lib/data";
import { homeRedirect } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { onColor } from "@/lib/colors";
import { STATUSES, STATUS_META, averageProgress, countByStatus } from "@/lib/progress";
import { HeroSearch } from "@/components/site/hero-search";
import { GoalGrid } from "@/components/goal-grid";
import { HeroIllustration } from "@/components/site/hero-illustration";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { StatusBadge } from "@/components/status-badge";
import { Donut } from "@/components/donut";
import { ArrowRightIcon, ChevronRightIcon, TriangleAlertIcon, SparklesIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { tracks, goals, indicators, config } = await getDashboard();

  // 첫 화면을 다른 메뉴로 지정했으면 그리로 보낸다 (관리자 → 상단 메뉴)
  const alt = homeRedirect(config.nav_hidden, config.nav_order, config.nav_home);
  if (alt) redirect(alt);

  const computed = indicators.map((i) => i.computed);
  const avg = averageProgress(computed);

  const targetCount = goals.reduce((n, g) => n + g.targets.length, 0);
  const keywords = (config.hero_keywords ?? "").split(";").map((s) => s.trim()).filter(Boolean);

  const attention = [...indicators]
    .filter((i) => i.computed.status === "지연" || i.computed.status === "악화")
    .sort((a, b) => (a.computed.progress ?? 0) - (b.computed.progress ?? 0))
    .slice(0, 7);

  const leading = [...indicators]
    .filter((i) => i.computed.status === "달성" || i.computed.status === "순조")
    .sort((a, b) => (b.computed.progress ?? 0) - (a.computed.progress ?? 0))
    .slice(0, 7);

  return (
    <>
      {/* 히어로 */}
      <section
        className="relative border-b"
        style={{ background: "linear-gradient(180deg, var(--brand-tint) 0%, var(--background) 100%)" }}
      >
        <HeroBackdrop />
        <div className="page relative grid items-center gap-6 py-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
          <HeroSearch
            headline={config.hero_headline || config.site_title}
            sub={config.site_subtitle}
            keywords={keywords}
            placeholder="지표명, 세부목표, 소관부처로 검색"
          />
          <HeroIllustration
            className="mx-auto w-[min(16rem,68vw)] lg:w-[17.5rem] xl:w-[19rem]"
            goals={goals.map((g) => ({
              no: g.no,
              name: g.name,
              color: g.color,
              progress: averageProgress(g.indicators.map((i) => i.computed)),
              count: g.indicators.length,
            }))}
            average={avg}
          />
        </div>
        {/* 17개 목표색 띠 — 원래 헤더에 있던 무지개 띠를 여기로 옮겼다 */}
        <div className="flex h-1.5 w-full">
          {goals.map((g) => (
            <div key={g.id} className="h-full flex-1" style={{ backgroundColor: g.color }} />
          ))}
        </div>
      </section>

      {/* 통계 스트립 */}
      <section className="border-b">
        <div className="page grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <Stat label={config.level1_label} value={goals.length} />
          <Stat label={config.level2_label} value={targetCount} />
          <Stat label={config.level3_label} value={indicators.length} />
          <Stat label="평균 달성도" value={avg === null ? "—" : `${Math.round(avg)}%`} />
        </div>
      </section>

      <div className="page flex flex-col gap-section py-section">
        {/* 17개 목표 */}
        <section>
          <SectionHead
            title={`17개 ${config.level1_label}`}
            desc={`${config.framework_name}의 ${config.level1_label} 전체입니다. 타일을 클릭하면 세부목표와 지표를 볼 수 있습니다.`}
            href="/goals"
            hrefLabel="전체 보기"
          />
          <GoalGrid goals={goals} className="mt-4" />
        </section>

        {/* 부문별 현황 */}
        <section>
          <SectionHead
            title={`${config.level0_label}별 현황`}
            desc={`${config.framework_name} 2부의 ${config.level0_label} 구분입니다.`}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tracks.map((t) => {
              const c = t.indicators.map((i) => i.computed);
              const tc = countByStatus(c);
              const tAvg = averageProgress(c);
              return (
                <Link
                  key={t.id}
                  href={`/areas/${t.code}`}
                  className="group flex flex-col gap-3 rounded-lg border bg-card p-5 transition-colors hover:border-foreground/25"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{t.icon ?? "◆"}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base leading-snug font-bold">{t.name}</h3>
                      {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                    </div>
                    <Donut value={tAvg} color={t.color} label="평균" />
                  </div>

                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {STATUSES.filter((s) => tc[s] > 0).map((s) => (
                      <div key={s} style={{ width: `${(tc[s] / c.length) * 100}%`, backgroundColor: STATUS_META[s].color }} title={`${s} ${tc[s]}개`} />
                    ))}
                  </div>

                  <ul className="flex flex-wrap gap-1.5">
                    {t.goals.map((g) => (
                      <li
                        key={g.id}
                        className="num inline-flex size-6 items-center justify-center rounded text-[11px] font-bold"
                        style={{ backgroundColor: g.color, color: onColor(g.color) }}
                        title={`${config.level1_label} ${g.no}. ${g.name}`}
                      >
                        {g.no}
                      </li>
                    ))}
                    <li className="ml-auto self-center text-xs text-muted-foreground">
                      {config.level3_label} <strong className="num text-foreground">{c.length}</strong>
                    </li>
                  </ul>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 주요 이행현황 — 관리가 필요한 곳과 잘 되고 있는 곳을 나란히 */}
        <section>
          <SectionHead
            title="주요 이행현황"
            desc={`${config.level3_label} ${indicators.length}개 중 특히 눈여겨볼 항목입니다.`}
            href="/indicators"
            hrefLabel="지표 탐색"
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <IndicatorList
              tone="warn"
              title={`관리가 필요한 ${config.level3_label}`}
              desc="기대 진행 속도에 못 미치거나 기준값보다 후퇴한 항목"
              items={attention}
              empty="현재 지연·악화 상태인 항목이 없습니다."
            />
            <IndicatorList
              tone="good"
              title={`순조로운 ${config.level3_label}`}
              desc="목표에 도달했거나 기대 속도를 앞서가는 항목"
              items={leading}
              empty="아직 달성·순조 판정을 받은 항목이 없습니다."
            />
          </div>
        </section>
      </div>
    </>
  );
}

function IndicatorList({
  tone,
  title,
  desc,
  items,
  empty,
}: {
  tone: "warn" | "good";
  title: string;
  desc: string;
  items: DashIndicator[];
  empty: string;
}) {
  const Icon = tone === "warn" ? TriangleAlertIcon : SparklesIcon;
  const accent = tone === "warn" ? "text-orange-600" : "text-emerald-600";

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", accent)} />
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">{desc}</p>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/indicators?indicator=${i.id}`}
                className="group/item -mx-2 flex items-center gap-3 rounded px-2 py-2 transition-colors hover:bg-muted"
              >
                <Image
                  src={`/ksdgs/goal-${String(i.goalNo).padStart(2, "0")}.svg`}
                  alt=""
                  width={127}
                  height={127}
                  unoptimized
                  className="size-8 shrink-0 rounded"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium group-hover/item:underline">{i.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="num">{i.code}</span>
                    <span>·</span>
                    <span className="truncate">{i.goalName}</span>
                  </div>
                </div>
                <span className="num shrink-0 text-sm font-bold">
                  {i.computed.progress === null ? "—" : `${Math.round(i.computed.progress)}%`}
                </span>
                <StatusBadge status={i.computed.status} size="sm" />
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/item:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-5 text-center sm:px-6">
      <div className="num text-[28px] leading-none font-bold sm:text-[34px]">{value}</div>
      <div className="mt-1.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHead({ title, desc, href, hrefLabel }: { title: string; desc?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:gap-2" style={{ transition: "gap 150ms" }}>
          {hrefLabel} <ArrowRightIcon className="size-4" />
        </Link>
      )}
    </div>
  );
}
