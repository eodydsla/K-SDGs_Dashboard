import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/data";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ArchiveIcon } from "lucide-react";
import { PlanTable } from "./plan-table";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const [plans, config] = await Promise.all([
    prisma.plan.findMany({ orderBy: { order: "asc" } }),
    getConfig(),
  ]);

  const withDoc = plans.filter((p) => p.hasDoc).length;
  const ministries = new Set(plans.map((p) => p.ministry?.trim()).filter(Boolean)).size;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">중ㆍ장기 행정계획</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          총 {plans.length}건 · 원문 확보 {withDoc}건 · 소관부처 {ministries}곳.
          원문 PDF는 <code className="rounded bg-muted px-1">public/plans/</code> 에 있으며,
          파일이 실제로 있는 항목만 공개 화면에 내려받기 버튼이 붙습니다.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          목록을 통째로 바꿀 때는 <code className="rounded bg-muted px-1">npx tsx scripts/build-plans.ts</code> →{" "}
          <code className="rounded bg-muted px-1">npm run db:seed</code> 를 쓰고,
          개별 수정은 아래에서 하세요. {config.org_name}
        </p>
      </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/api/export?type=plans" />}>
            <DownloadIcon /> 목록 CSV
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/api/plans/download" />}>
            <ArchiveIcon /> 원문 {withDoc}건 ZIP
          </Button>
        </div>
      </div>

      <PlanTable
        plans={plans.map((p) => ({
          id: p.id,
          seq: p.seq,
          name: p.name,
          law: p.law,
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
          published: p.published,
        }))}
      />
    </div>
  );
}
