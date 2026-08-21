import Link from "next/link";
import { getIndicatorStatMap } from "@/lib/futures";
import { getConfig } from "@/lib/data";
import { IndicatorStatMap } from "@/components/futures/indicator-stat-map";

export const dynamic = "force-dynamic";

/**
 * 데이터맵 — K-SDGs 지표를 중심에 두고 그 지표를 잴 수 있는 통계로 가지를 뻗는다.
 * 목표 → 세부목표 → 지표 → 연관통계 순으로 펼쳐진다.
 *
 * 방향이 반대인 지도(통계 → K-SDGs)는 /futures/sources 에 따로 있다.
 */
export default async function DataMapPage() {
  const [map, config] = await Promise.all([getIndicatorStatMap(), getConfig()]);

  const total = map.reduce((n, g) => n + g.indicatorCount, 0);
  const linked = map.reduce((n, g) => n + g.linkedCount, 0);
  const stats = new Set(map.flatMap((g) => g.targets.flatMap((t) => t.indicators.flatMap((i) => i.stats.map((s) => s.code))))).size;
  const links = map.reduce((n, g) => n + g.targets.reduce((m, t) => m + t.indicators.reduce((k, i) => k + i.stats.length, 0), 0), 0);

  return (
    <div className="page flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">데이터맵</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          K-SDGs {config.level3_label} 하나하나를 <strong className="text-foreground">무엇으로 잴 수 있는지</strong>{" "}
          국내 공식 통계로 이어 놓은 지도입니다. {config.level1_label} → {config.level2_label} → {config.level3_label} → 연관 통계 순으로 펼쳐집니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat v={total} l={`전체 ${config.level3_label}`} />
        <Stat v={linked} l="통계가 연결된 지표" sub={`${Math.round((linked / (total || 1)) * 100)}%`} />
        <Stat v={stats} l="연결된 통계" />
        <Stat v={links} l="연결 수" />
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">연결은 자동 도출한 것이며 검수 전입니다.</strong>{" "}
        지표명·{config.level2_label}·정의를 통계 메타의 키워드와 대조해 기계적으로 이었습니다. 「자동」 표시가 붙은 연결은
        소관 부서 확인이 필요합니다. 또한 KOSIS 통계표 코드는 지어낼 위험이 있어 싣지 않았으므로,
        인용 전 <a href="https://kosis.kr" target="_blank" rel="noreferrer" className="text-brand hover:underline">KOSIS</a> 등에서
        정확한 통계표명을 확인하세요.{" "}
        <Link href="/futures/sources" className="text-brand hover:underline">반대 방향 지도(통계 → K-SDGs)</Link>도 있습니다.
      </div>

      <IndicatorStatMap goals={map} level3Label={config.level3_label} />
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
