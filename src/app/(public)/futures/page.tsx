import Link from "next/link";
import Image from "next/image";
import { getScenarios, axisOf, AXES, BADGES, type AxisKey } from "@/lib/futures";
import { getDashboard } from "@/lib/data";
import { ImpactMatrix } from "@/components/futures/impact-matrix";
import { ArrowRightIcon } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * 미래변화분석 — 공식 장기 전망 10종이 K-SDGs 목표에 미치는 영향.
 * 숫자마다 출처 배지가 붙는다. 추정(E)을 공식 전망(R)처럼 보이게 두지 않는 것이 이 화면의 원칙이다.
 */
export default async function FuturesPage() {
  const [scenarios, { goals, config }] = await Promise.all([getScenarios(), getDashboard()]);
  const allInd = scenarios.flatMap((s) => s.indicators);
  const direct = allInd.filter((i) => i.kind === "direct").length;
  const points = allInd.reduce((n, i) => n + i.series.length, 0);

  const byAxis = (Object.keys(AXES) as AxisKey[])
    .map((k) => ({ key: k, ...AXES[k], list: scenarios.filter((s) => s.axis === k) }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="page flex flex-col gap-section py-8">
      <div>
        <h1 className="text-2xl font-bold">미래변화분석</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          정부·국제기구가 공식 발표한 장기 전망 {scenarios.length}종이 국가지속가능발전목표에 미치는 직접·간접 영향입니다.
          모든 수치에 출처 배지와 산출 근거를 붙였습니다.
        </p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat v={scenarios.length} l="시나리오" />
        <Stat v={allInd.length} l="전망 지표" />
        <Stat v={direct} l="직접 지표" sub={`간접 ${allInd.length - direct}`} />
        <Stat v={points} l="데이터 포인트" />
      </div>

      {/* 출처 배지 안내 — 화면 맨 앞에 둔다 */}
      <section className="rounded-lg border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-bold">이 화면의 숫자를 읽는 법</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          같은 그래프 안에서도 값마다 출처가 다릅니다. 배지를 먼저 보고 인용 여부를 판단하세요.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(BADGES) as (keyof typeof BADGES)[]).map((k) => {
            const b = BADGES[k];
            const n = allInd.filter((i) => i.badge === k).length;
            return (
              <li key={k} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="num inline-grid size-5 place-items-center rounded text-[11px] font-bold text-white"
                    style={{ backgroundColor: b.color }}
                  >
                    {k}
                  </span>
                  <span className="text-sm font-semibold">{b.label}</span>
                  <span className="num ml-auto text-xs text-muted-foreground">{n}</span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{b.desc}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 영향 매트릭스 */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold">시나리오 × {config.level1_label} 영향</h2>
          <p className="text-sm text-muted-foreground">칸을 누르면 해당 시나리오로 이동합니다.</p>
        </div>
        <ImpactMatrix
          className="mt-4"
          scenarios={scenarios.map((s) => ({
            code: s.code,
            title: s.title,
            axis: s.axis,
            axisColor: axisOf(s.axis).color,
            impacts: s.indicators.map((i) => ({
              goal: i.sdgPrimary,
              secondary: i.sdgSecondary,
              kind: i.kind,
              direction: i.direction,
              strength: i.strength,
              name: i.name,
            })),
          }))}
          goals={goals.map((g) => ({ no: Number(g.no), name: g.name, color: g.color }))}
        />
      </section>

      {/* 축별 시나리오 카드 */}
      {byAxis.map((g) => (
        <section key={g.key}>
          <div className="flex items-baseline gap-2 border-b pb-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
            <h2 className="text-lg font-bold">{g.label}</h2>
            <span className="num text-xs text-muted-foreground">{g.list.length}</span>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.list.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/futures/${s.code}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/25"
                >
                  <div className="h-1" style={{ backgroundColor: g.color }} />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="num text-[10px] tracking-wider text-muted-foreground">{s.code}</div>
                    <h3 className="text-[15px] leading-snug font-bold">{s.title}</h3>
                    {s.headline?.value && (
                      <div>
                        <div className="num text-xl font-bold" style={{ color: g.color }}>{s.headline.value}</div>
                        <div className="text-[11px] text-muted-foreground">{s.headline.label}</div>
                        {s.headline.delta && <div className="num text-[11px] text-muted-foreground">{s.headline.delta}</div>}
                      </div>
                    )}
                    {s.subtitle && <p className="line-clamp-2 text-xs text-muted-foreground">{s.subtitle}</p>}

                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
                      {[...new Set(s.indicators.map((i) => i.sdgPrimary).filter((n): n is number => !!n))]
                        .sort((a, b) => a - b)
                        .slice(0, 8)
                        .map((no) => (
                          <Image
                            key={no}
                            src={`/ksdgs/goal-${String(no).padStart(2, "0")}.svg`}
                            alt={`목표 ${no}`}
                            title={`목표 ${no}`}
                            width={127}
                            height={127}
                            unoptimized
                            className="size-5 rounded-[3px]"
                          />
                        ))}
                      <span className="num ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-brand">
                        지표 {s.indicators.length} <ArrowRightIcon className="size-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Stat({ v, l, sub }: { v: number; l: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3.5 text-center">
      <div className="num text-2xl leading-none font-bold">{v}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{l}</div>
      {sub && <div className="num text-[10px] text-muted-foreground opacity-70">{sub}</div>}
    </div>
  );
}
