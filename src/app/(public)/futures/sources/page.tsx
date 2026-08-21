import { getStats, getScenarios } from "@/lib/futures";
import { getDashboard } from "@/lib/data";
import { SourceMap } from "@/components/futures/source-map";

export const dynamic = "force-dynamic";

/**
 * 전망 데이터 출처 — 미래변화분석의 전망치가 어느 통계에서 나왔는지 되짚는 화면.
 *
 * **통계가 중심**이고 거기서 K-SDGs 쪽으로 가지를 뻗는다.
 * 지표를 중심에 두고 통계로 뻗어나가는 지도는 /datamap 에 따로 있다 (방향이 반대).
 */
export default async function FutureSourcesPage() {
  const [stats, scenarios, dash] = await Promise.all([getStats(), getScenarios(), getDashboard()]);
  const { goals, config } = dash;

  const scenIndName = new Map(
    scenarios.flatMap((s) => s.indicators.map((i) => [i.code, { name: i.name, scenario: s.title, code: s.code }] as const)),
  );

  // 세부목표 코드 → 그 아래 K-SDGs 지표
  const targetInfo = new Map(
    goals.flatMap((g) =>
      g.targets.map((t) => [t.code, {
        name: t.name,
        goalNo: Number(g.no),
        goalName: g.name,
        color: g.color,
        indicators: t.indicators.map((i) => ({ code: i.code, name: i.name })),
      }] as const),
    ),
  );

  const nodes = stats.map((s) => {
    const targets = s.targets
      .map((code) => {
        const t = targetInfo.get(code);
        return t ? { code, ...t } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      code: s.code,
      name: s.name,
      org: s.org,
      portal: s.portal,
      freq: s.freq,
      note: s.note,
      url: s.url,
      goals: s.goals,
      targets,
      /** 목록에는 있으나 우리 세부목표 체계에 없는 코드 — 조용히 버리지 않고 표시한다 */
      unmatchedTargets: s.targets.filter((c) => !targetInfo.has(c)),
      links: s.links.map((l) => ({
        code: l.indicatorCode,
        match: l.match,
        name: scenIndName.get(l.indicatorCode)?.name ?? l.indicatorCode,
        scenario: scenIndName.get(l.indicatorCode)?.scenario ?? "",
        scenarioCode: scenIndName.get(l.indicatorCode)?.code ?? "",
      })),
    };
  });

  const linkedTargets = new Set(nodes.flatMap((n) => n.targets.map((t) => t.code)));
  const totalTargets = goals.reduce((n, g) => n + g.targets.length, 0);

  return (
    <div className="page flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">전망 데이터 출처</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          미래변화분석의 전망치가 어느 통계에서 나왔는지 되짚습니다. 통계 {stats.length}종을 가운데 두고
          K-SDGs {config.level2_label}와 시나리오 전망지표로 가지를 뻗습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat v={stats.length} l="연관 통계" />
        <Stat v={linkedTargets.size} l={`연결된 ${config.level2_label}`} sub={`전체 ${totalTargets}`} />
        <Stat v={nodes.reduce((n, x) => n + x.links.length, 0)} l="전망지표 연결" />
        <Stat v={new Set(stats.map((s) => s.org)).size} l="작성기관" />
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        통계명과 작성기관은 널리 통용되는 명칭 기준입니다. KOSIS 통계표 코드는 임의로 만들어낼 위험이 있어 싣지 않았습니다.
        <strong className="text-foreground"> 실제 인용 전에는 KOSIS 또는 각 기관 누리집에서 정확한 통계표명과 최신 공표 시점을 확인하세요.</strong>
      </div>

      <SourceMap
        nodes={nodes}
        goals={goals.map((g) => ({ no: Number(g.no), name: g.name, color: g.color }))}
        level2Label={config.level2_label}
        level3Label={config.level3_label}
      />
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
