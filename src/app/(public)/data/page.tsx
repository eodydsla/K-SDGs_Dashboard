import Link from "next/link";
import { getDashboard } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { MinistryBars } from "@/components/ministry-bars";
import { DownloadIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { type: "indicators", label: "지표 메타데이터", desc: "정의·단위·기준값·2030/2040 목표·소관부처" },
  { type: "values", label: "연도별 실적값", desc: "지표별 연도·값·지역" },
  { type: "targets", label: "세부목표", desc: "119개 세부목표와 소관부처" },
  { type: "goals", label: "목표", desc: "17개 목표와 부문 구분" },
];

export default async function DataPage() {
  const { indicators, config } = await getDashboard();

  return (
    <div className="page flex flex-col gap-section py-8">
      <div>
        <h1 className="text-2xl font-bold">데이터 · 방법론</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          이 사이트가 사용하는 데이터의 출처와 내려받기입니다. 원본은 {config.framework_name} 본문입니다.
        </p>
      </div>

      {config.data_status && (
        <div className="rounded-lg border border-brand/30 bg-brand-tint px-4 py-3 text-sm">
          <strong>현재 데이터 상태</strong> · {config.data_status}
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold">내려받기</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EXPORTS.map((e) => (
            <li key={e.type} className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{e.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{e.desc}</p>
              </div>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/api/export?type=${e.type}`} />}>
                <DownloadIcon /> CSV
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold">소관부처별 {config.level3_label} 분포</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          세부목표에 지정된 소관부처를 하위 지표로 상속시켜 집계했습니다.
        </p>
        <MinistryBars indicators={indicators} className="mt-4" />
      </section>

      <section>
        <h2 className="text-lg font-bold">방법론</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          달성도 산정식과 상태 판정 기준은{" "}
          <Link href="/about/ksdgs" className="font-medium text-brand hover:underline">K-SDGs 개요</Link> 문서에 정리되어 있습니다.
        </p>
      </section>
    </div>
  );
}
