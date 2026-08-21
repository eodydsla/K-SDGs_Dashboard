import path from "node:path";
import { prisma } from "@/lib/prisma";
import { createZipStream } from "@/lib/zip";

export const dynamic = "force-dynamic";
/** 1GB를 흘려보내야 하므로 Node 런타임이어야 한다 (Edge 불가) */
export const runtime = "nodejs";

const DOC_DIR = path.join(process.cwd(), "public", "plans");

/**
 * 행정계획 원문 일괄 내려받기.
 *
 * GET /api/plans/download            공개 + 원문 확보된 전체
 * GET /api/plans/download?seq=1,2,3  해당 연번만
 *
 * 원문이 없는 계획은 애초에 목록에 담기지 않는다("있는 것만" 받게 한다).
 */
export async function GET(req: Request) {
  const seqParam = new URL(req.url).searchParams.get("seq");
  const seqs = seqParam
    ? seqParam.split(",").map((x) => x.trim()).filter(Boolean)
    : null;

  const plans = await prisma.plan.findMany({
    where: {
      published: true,
      hasDoc: true,
      ...(seqs?.length ? { seq: { in: seqs } } : {}),
    },
    orderBy: { order: "asc" },
  });

  const entries = plans
    .map((p) => {
      if (!p.docFile) return null;
      const base = path.basename(p.docFile);
      const abs = path.resolve(DOC_DIR, base);
      // 경로 이탈 방지 — docFile 은 DB에서 오지만 파일 접근이므로 한 번 더 막는다
      if (!abs.startsWith(DOC_DIR + path.sep)) return null;
      // ZIP 안에서는 연번을 앞에 붙여 별표 순서대로 정렬되게 한다
      return { name: `행정계획/${p.seq.padStart(3, "0")}_${base}`, path: abs };
    })
    .filter((x): x is { name: string; path: string } => x !== null);

  if (!entries.length) {
    return new Response("내려받을 수 있는 원문이 없습니다.", { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `중장기_행정계획_원문_${entries.length}건_${stamp}.zip`;

  return new Response(createZipStream(entries), {
    headers: {
      "Content-Type": "application/zip",
      // 한글 파일명은 RFC 5987 로 넘긴다
      "Content-Disposition": `attachment; filename="plans.zip"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
