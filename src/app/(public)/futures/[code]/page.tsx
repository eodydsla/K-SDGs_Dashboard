import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getScenarios, findScenario, axisOf, BADGES, CONFIDENCE, toList } from "@/lib/futures";
import { getDashboard } from "@/lib/data";
import { SeriesChart } from "@/components/futures/series-chart";
import { ArrowLeftIcon, ArrowRightIcon, ExternalLinkIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScenarioPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [scenarios, { goals, config }] = await Promise.all([getScenarios(), getDashboard()]);
  const s = findScenario(scenarios, code);
  if (!s) notFound();

  const axis = axisOf(s.axis);
  const goalName = new Map(goals.map((g) => [Number(g.no), g.name]));
  const idx = scenarios.findIndex((x) => x.id === s.id);
  const prev = scenarios[idx - 1] ?? null;
  const next = scenarios[idx + 1] ?? null;

  return (
    <div className="page flex flex-col gap-6 py-8">
      <Link href="/futures" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" /> 미래변화분석
      </Link>

      {/* 머리말 */}
      <header className="overflow-hidden rounded-lg border bg-card">
        <div className="h-1.5" style={{ backgroundColor: axis.color }} />
        <div className="flex flex-wrap items-start justify-between gap-6 p-5 sm:p-6">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="num rounded px-1.5 py-0.5 font-semibold text-white" style={{ backgroundColor: axis.color }}>
                {s.code}
              </span>
              <span>{axis.label}</span>
              {s.yearFrom && s.yearTo && <span className="num">{s.yearFrom}~{s.yearTo}</span>}
            </div>
            <h1 className="mt-2 text-2xl leading-tight font-bold">{s.title}</h1>
            {s.subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{s.subtitle}</p>}
            {(s.org || s.doc) && (
              <p className="mt-3 text-xs text-muted-foreground">
                {s.org}
                {s.doc && ` · ${s.doc}`}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-brand hover:underline">
                    원문 <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </p>
            )}
          </div>

          {s.headline?.value && (
            <div className="shrink-0 text-right">
              <div className="text-xs text-muted-foreground">{s.headline.label}</div>
              <div className="num text-3xl font-bold" style={{ color: axis.color }}>{s.headline.value}</div>
              {s.headline.delta && <div className="num text-xs text-muted-foreground">{s.headline.delta}</div>}
              {s.headline.badge && <Badge b={s.headline.badge} c={s.headline.confidence} className="mt-1.5" />}
            </div>
          )}
        </div>
      </header>

      {/* 정의 · 가정 · 불확실성 */}
      <section className="grid gap-4 lg:grid-cols-3">
        {s.definition && (
          <Note title="시나리오 정의" className="lg:col-span-3">
            <p>{s.definition}</p>
            {s.variants.length > 0 && (
              <p className="mt-2 text-xs">
                변형: {s.variants.map((v) => (
                  <span key={v} className="mr-1 inline-block rounded border px-1.5 py-0.5 text-[11px]">{v}</span>
                ))}
              </p>
            )}
          </Note>
        )}
        {s.assumptions.length > 0 && (
          <Note title="주요 가정" className="lg:col-span-2">
            <ul className="list-disc pl-4">
              {s.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </Note>
        )}
        {s.uncertainty && <Note title="불확실성">{s.uncertainty}</Note>}
      </section>

      {/* 지표 */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold">전망 지표 {s.indicators.length}</h2>
          <p className="text-sm text-muted-foreground">
            직접 {s.indicators.filter((i) => i.kind === "direct").length} · 간접 {s.indicators.filter((i) => i.kind === "indirect").length}
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {s.indicators.map((ind) => (
            <article key={ind.id} className="flex flex-col rounded-lg border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-2">
                <span className="num text-[10px] text-muted-foreground">{ind.code}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    ind.kind === "direct" ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {ind.kind === "direct" ? "직접" : "간접"}
                </span>
                {ind.badge && <Badge b={ind.badge} c={ind.confidence} />}
                {ind.sdgPrimary && (
                  <Link href={`/goals/${ind.sdgPrimary}`} className="ml-auto inline-flex items-center gap-1 text-[11px] hover:underline" title={goalName.get(ind.sdgPrimary)}>
                    <Image
                      src={`/ksdgs/goal-${String(ind.sdgPrimary).padStart(2, "0")}.svg`}
                      alt="" width={127} height={127} unoptimized className="size-5 rounded-[3px]"
                    />
                    {config.level1_label} {ind.sdgPrimary}
                  </Link>
                )}
              </div>

              <h3 className="mt-2 text-[15px] font-bold">{ind.name}</h3>
              <p className="num mt-0.5 text-xs text-muted-foreground">
                {ind.headline}
                {ind.unit ? ` · ${ind.unit}` : ""}
              </p>

              <SeriesChart
                className="mt-3"
                series={ind.series}
                alts={ind.seriesAlt}
                unit={ind.unit}
                color={axis.color}
                seriesName={ind.seriesName}
              />

              {ind.method && (
                <details className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
                  <summary className="cursor-pointer font-medium">산출 방법과 한계</summary>
                  <div className="mt-2 flex flex-col gap-2 text-muted-foreground">
                    {ind.method.definition && <p>{ind.method.definition}</p>}
                    {ind.method.steps && ind.method.steps.length > 0 && (
                      <div><strong className="text-foreground">산출 절차</strong>
                        <ol className="mt-0.5 list-decimal pl-4">{ind.method.steps.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
                    )}
                    {ind.method.assumptions && ind.method.assumptions.length > 0 && (
                      <div><strong className="text-foreground">가정</strong>
                        <ul className="mt-0.5 list-disc pl-4">{ind.method.assumptions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                    )}
                    {toList(ind.method.limits).length > 0 && (
                      <div><strong className="text-foreground">한계</strong>
                        <ul className="mt-0.5 list-disc pl-4">{toList(ind.method.limits).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                    )}
                    {ind.method.badge_reason && <p><strong className="text-foreground">배지 사유</strong> {ind.method.badge_reason}</p>}
                    {ind.method.sources && ind.method.sources.length > 0 && (
                      <div><strong className="text-foreground">출처</strong>
                        <ul className="mt-0.5 flex flex-col gap-0.5">
                          {ind.method.sources.map((src, i) => (
                            <li key={i}>
                              {src.url ? (
                                <a href={src.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">{src.title}</a>
                              ) : src.title}
                              {src.org && <span> · {src.org}</span>}
                              {src.year && <span className="num"> ({src.year})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-3 border-t pt-4 text-sm">
        {prev ? (
          <Link href={`/futures/${prev.code}`} className="inline-flex min-w-0 items-center gap-2 hover:underline">
            <ArrowLeftIcon className="size-4 shrink-0" />
            <span className="truncate">{prev.title}</span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/futures/${next.code}`} className="inline-flex min-w-0 items-center gap-2 text-right hover:underline">
            <span className="truncate">{next.title}</span>
            <ArrowRightIcon className="size-4 shrink-0" />
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}

function Note({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${className ?? ""}`}>
      <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function Badge({ b, c, className }: { b: string; c?: string | null; className?: string }) {
  const meta = BADGES[b as keyof typeof BADGES];
  const conf = c ? CONFIDENCE[c as keyof typeof CONFIDENCE] : null;
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${className ?? ""}`}
      title={`${meta.label} — ${meta.desc}${conf ? `\n신뢰도 ${conf.label}: ${conf.desc}` : ""}`}
    >
      <span className="size-1.5 rounded-sm" style={{ backgroundColor: meta.color }} />
      <span className="num font-bold">{b}</span>
      <span className="text-muted-foreground">{meta.label}</span>
      {conf && <span className="text-muted-foreground">· 신뢰도 {conf.label}</span>}
    </span>
  );
}
