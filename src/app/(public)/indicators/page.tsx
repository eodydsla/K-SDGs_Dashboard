import { getDashboard } from "@/lib/data";
import { IndicatorsExplorer } from "@/components/indicators-explorer";

export const dynamic = "force-dynamic";

/** 전체 지표 탐색 — 홈 히어로 검색이 도착하는 곳. 236개 지표를 부문 구분 없이 한 번에 본다. */
export default async function AllIndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; goal?: string; indicator?: string }>;
}) {
  const { q, goal, indicator } = await searchParams;
  const { goals, indicators, config } = await getDashboard();

  return (
    <div className="page flex flex-col gap-5 py-8">
      <div>
        <h1 className="text-2xl font-bold">{config.level3_label} 찾기</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {config.framework_name}의 {config.level3_label} {indicators.length}개 전체입니다. 카드를 클릭하면 정의·목표·추이를 볼 수 있습니다.
        </p>
      </div>
      <IndicatorsExplorer
        goals={goals}
        indicators={indicators}
        initialGoal={goal}
        initialIndicator={indicator}
        initialQuery={q}
        level1Label={config.level1_label}
        level2Label={config.level2_label}
      />
    </div>
  );
}
