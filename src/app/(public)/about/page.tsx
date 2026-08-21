import { getConfig } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const config = await getConfig();
  return (
    <>
      <h1>{config.org_name}</h1>
      <p className="lead">
        국가지속가능발전연구센터는 국무조정실과 한국환경연구원(KEI)이 함께 설립한 지속가능발전 정책 연구·지원 기관입니다.
        데이터에 기반해 국가지속가능발전목표(K-SDGs)의 이행 상황을 점검하고, 정부의 지속가능발전 정책 수립을 뒷받침합니다.
      </p>

      <h2>주요 기능</h2>
      <ul>
        <li><strong>이행 점검</strong> — {config.framework_name}의 목표·세부목표·지표 이행 현황을 정기적으로 측정하고 공개합니다.</li>
        <li><strong>지표 체계 관리</strong> — 지표의 정의·산출식·출처를 정비하고, 통계가 구축되지 않은 지표의 대안을 검토합니다.</li>
        <li><strong>정책 연구</strong> — 국가·지방의 지속가능발전 정책과 법정계획을 분석하고 개선 방향을 제시합니다.</li>
        <li><strong>계획 검토 지원</strong> — 부처 법정계획이 지속가능발전 기본계획을 어떻게 반영하고 있는지 사전 검토합니다.</li>
      </ul>

      <h2>소속</h2>
      <p>{config.org_parent}</p>

      <h2>이 사이트</h2>
      <p>
        이 사이트는 {config.framework_name}에 수록된 지표를 그대로 옮겨 이행 상황을 시각화한 것입니다.
        수치는 계획 원문에서 추출한 값이며, 소관부처가 공표하는 최신 통계와 다를 수 있습니다.
        연도별 시계열은 순차적으로 보강하고 있습니다.
      </p>
    </>
  );
}
