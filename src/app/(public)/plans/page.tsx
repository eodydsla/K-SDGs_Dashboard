import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/data";
import { PlansExplorer } from "@/components/plans-explorer";

export const dynamic = "force-dynamic";

/**
 * 중ㆍ장기 행정계획 목록.
 * 「지속가능발전 기본법 시행령」[별표] 제9조제2항 — 지속가능발전 기본전략과의
 * 조화 여부를 검토받아야 하는 중앙행정기관 계획 200건(본번 198 + 가지번호 2)이다.
 */
export default async function PlansPage() {
  const [plans, config] = await Promise.all([
    prisma.plan.findMany({ where: { published: true }, orderBy: { order: "asc" } }),
    getConfig(),
  ]);

  const withDoc = plans.filter((p) => p.hasDoc).length;

  return (
    <div className="page flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">중ㆍ장기 행정계획</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          「지속가능발전 기본법 시행령」 [별표] 중ㆍ장기 행정계획의 범위(제9조제2항 관련)에 따라
          국가지속가능발전 기본전략과의 조화 여부를 검토받는 중앙행정기관의 계획입니다.
          총 <strong className="num text-foreground">{plans.length}</strong>건 중{" "}
          <strong className="num text-foreground">{withDoc}</strong>건의 원문을 내려받을 수 있습니다.
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          연번은 별표 원문을 따릅니다. 본번 198개에 가지번호 2개(73의2·73의3)가 더해져 200건입니다.
        </p>
      </div>

      <PlansExplorer
        plans={plans.map((p) => ({
          id: p.id,
          seq: p.seq,
          name: p.name,
          law: p.law,
          article: p.article,
          edition: p.edition,
          period: p.period,
          cycle: p.cycle,
          ministry: p.ministry,
          confidence: p.confidence,
          hasDoc: p.hasDoc,
          docFile: p.docFile,
          docSize: p.docSize,
          remark: p.remark,
          sourceUrl: p.sourceUrl,
          note: p.note,
        }))}
        orgName={config.org_name}
      />
    </div>
  );
}
