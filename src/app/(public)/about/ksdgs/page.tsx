import Link from "next/link";
import { getDashboard } from "@/lib/data";
import { onColor } from "@/lib/colors";

export const dynamic = "force-dynamic";

/** K-SDGs 개요 — 수치는 하드코딩하지 않고 DB에서 읽어 화면과 항상 일치하게 한다. */
export default async function KsdgsPage() {
  const { tracks, goals, indicators, config } = await getDashboard();
  const targets = goals.reduce((n, g) => n + g.targets.length, 0);
  const byKind = indicators.reduce<Record<string, number>>((a, i) => {
    const k = i.kind ?? "미분류";
    a[k] = (a[k] ?? 0) + 1;
    return a;
  }, {});

  return (
    <>
      <h1>국가지속가능발전목표(K-SDGs) 개요</h1>
      <p className="lead">
        K-SDGs는 UN이 채택한 지속가능발전목표를 우리나라 여건에 맞게 재구성한 국가 목표 체계입니다.
        현재 적용되는 체계는 <strong>{config.framework_name}</strong>이며,{" "}
        <strong>{goals.length}개 목표 · {targets}개 세부목표 · {indicators.length}개 지표</strong>로 구성됩니다.
      </p>

      <h2>배경과 의의</h2>
      <p>
        기존 국내 지표는 환경 분야에 치우쳐 있었습니다. K-SDGs는 사회·경제 분야 지표를 보완해
        균형 잡힌 목표 체계를 만들었다는 점에 의의가 있습니다. 또한 목표 번호를 UN-SDGs와 동일하게 유지해
        국제 비교와 국가 보고가 가능하도록 설계되었습니다.
      </p>
      <p>
        제4차 기본계획은 2021년부터 2040년까지 20년을 대상으로 하며, 2030년을 중간 목표연도,
        2040년을 최종 목표연도로 두는 <strong>2단 목표 구조</strong>를 갖습니다.
        이 사이트의 지표 화면에서 목표선이 두 개 표시되는 이유입니다.
      </p>

      <h2>목표 체계</h2>
      <p>17개 목표는 계획 2부에서 다음 {tracks.length}개 {config.level0_label}으로 묶입니다.</p>
      <ul className="not-prose flex flex-col gap-3">
        {tracks.map((t) => (
          <li key={t.id} className="rounded-lg border p-4">
            <div className="text-sm font-bold">{t.icon} {t.name}</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {t.goals.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/goals/${g.no}`}
                    className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors hover:border-foreground/30"
                  >
                    <span
                      className="num inline-grid size-4 place-items-center rounded-[3px] text-[9px] font-bold"
                      style={{ backgroundColor: g.color, color: onColor(g.color) }}
                    >
                      {g.no}
                    </span>
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h2>지표 유형</h2>
      <p>
        모든 지표가 수치 목표를 갖는 것은 아닙니다. 「지속 감소」·「안정적 유지」처럼 서술형으로 제시된 목표,
        기준값만 있고 목표값이 설정되지 않은 관찰용 지표, 통계 자체가 아직 구축되지 않은 지표가 함께 있습니다.
        이 사이트는 이를 숨기지 않고 유형으로 구분해 표시합니다.
      </p>
      <table>
        <thead><tr><th>유형</th><th>지표 수</th><th>설명</th></tr></thead>
        <tbody>
          <tr><td>정량</td><td className="num">{byKind["정량"] ?? 0}</td><td>수치 목표값이 설정되어 달성도를 계산할 수 있는 지표</td></tr>
          <tr><td>정성</td><td className="num">{byKind["정성"] ?? 0}</td><td>「지속 감소」 등 서술형 목표가 제시된 지표</td></tr>
          <tr><td>모니터링</td><td className="num">{byKind["모니터링"] ?? 0}</td><td>기준값은 있으나 목표값이 설정되지 않은 관찰용 지표</td></tr>
          <tr><td>통계미구축</td><td className="num">{byKind["통계미구축"] ?? 0}</td><td>통계가 아직 구축되지 않아 수치를 제시할 수 없는 지표</td></tr>
        </tbody>
      </table>

      <h2>달성도 산정 방법</h2>
      <p>이 사이트의 달성도는 다음 식으로 계산합니다.</p>
      <pre><code>{`진행률(%)    = (최신값 − 기준값) ÷ (목표값 − 기준값) × 100
기대진행률(%) = (최신 데이터 연도 − 기준연도) ÷ (목표연도 − 기준연도) × 100`}</code></pre>
      <p>
        기대진행률을 <em>현재 연도</em>가 아니라 <em>최신 데이터 연도</em> 기준으로 잡는 이유는,
        통계 공표가 1~2년 늦는 지표를 현재 연도와 비교하면 정상적인 지표까지 모두 「지연」으로 판정되기 때문입니다.
      </p>
      <ul>
        <li><strong>달성</strong> — 진행률 100% 이상</li>
        <li><strong>순조</strong> — 진행률이 기대진행률의 90% 이상</li>
        <li><strong>지연</strong> — 진행률이 기대진행률의 90% 미만</li>
        <li><strong>악화</strong> — 진행률이 음수, 즉 기준값보다 후퇴</li>
        <li><strong>모니터링</strong> — 목표값이 없어 진행률을 계산할 수 없음</li>
        <li><strong>자료없음</strong> — 실적값이 아직 입력되지 않음</li>
      </ul>

      <h2>출처와 한계</h2>
      <p>{config.footer_note}</p>
    </>
  );
}
