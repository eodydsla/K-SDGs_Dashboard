"use client";

import { useActionState, useMemo, useState } from "react";
import { savePlan, togglePlanPublished, uploadPlanDoc, deletePlanDoc, type ActionResult } from "@/lib/admin-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SearchIcon, PencilIcon, EyeIcon, EyeOffIcon, DownloadIcon, FileXIcon, PlusIcon, UploadIcon, Trash2Icon } from "lucide-react";

export interface AdminPlan {
  id: string;
  seq: string;
  name: string;
  law: string | null;
  edition: string | null;
  period: string | null;
  cycle: string | null;
  ministry: string | null;
  confidence: string | null;
  hasDoc: boolean;
  docFile: string | null;
  docSize: number | null;
  remark: string | null;
  sourceUrl: string | null;
  note: string | null;
  published: boolean;
}

const CONFIDENCES = ["확인", "참고", "미확인", "해당없음"];

/** 저장 경로에서 파일명만 — 한글이 %EC.. 로 보이지 않게 디코드한다 */
function docName(docFile: string) {
  try {
    return decodeURIComponent(docFile.replace(/^\/plans\//, ""));
  } catch {
    return docFile.replace(/^\/plans\//, "");
  }
}

export function PlanTable({ plans }: { plans: AdminPlan[] }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);

  // 새 계획의 기본 연번 — 기존 최대 본번 +1
  const nextSeq = String(
    Math.max(0, ...plans.map((p) => Number(p.seq)).filter((n) => Number.isFinite(n))) + 1,
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return plans;
    return plans.filter((p) =>
      `${p.seq} ${p.name} ${p.law ?? ""} ${p.ministry ?? ""} ${p.edition ?? ""}`.toLowerCase().includes(kw),
    );
  }, [plans, q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="계획명·부처·근거법률 검색" className="pl-9" />
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon /> 행정계획 추가
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length}건 표시</p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[58rem] text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">연번</th>
              <th className="px-3 py-2 text-left font-medium">계획명</th>
              <th className="px-3 py-2 text-left font-medium">차수·기간</th>
              <th className="px-3 py-2 text-left font-medium">소관부처</th>
              <th className="px-3 py-2 text-left font-medium">신뢰도</th>
              <th className="px-3 py-2 text-left font-medium">원문</th>
              <th className="px-3 py-2 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className={cn("border-t align-top", !p.published && "opacity-45")}>
                <td className="num px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">{p.seq}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{p.name}</div>
                  {p.law && <div className="text-[11px] text-muted-foreground">{p.law}</div>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.edition}
                  {p.period && <span className="num block text-muted-foreground">{p.period}</span>}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{p.ministry}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{p.confidence}</td>
                <td className="max-w-56 px-3 py-2 text-xs">
                  {p.hasDoc && p.docFile ? (
                    <>
                      <a href={p.docFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                        <DownloadIcon className="size-3.5 shrink-0" />
                        <span className="num">{p.docSize ? `${(p.docSize / 1024 / 1024).toFixed(1)}MB` : "파일"}</span>
                      </a>
                      <div className="truncate text-[10px] text-muted-foreground" title={docName(p.docFile)}>
                        {docName(p.docFile)}
                      </div>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <FileXIcon className="size-3.5" /> 미확보
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} title="수정">
                      <PencilIcon />
                    </Button>
                    <TogglePublished plan={p} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-3 py-12 text-center text-sm text-muted-foreground">결과가 없습니다.</p>}
      </div>

      <EditDialog plan={editing} onClose={() => setEditing(null)} />
      <CreateDialog open={creating} defaultSeq={nextSeq} onClose={() => setCreating(false)} />
    </div>
  );
}

function TogglePublished({ plan }: { plan: AdminPlan }) {
  const [, action, pending] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const r = await togglePlanPublished(prev, fd);
    toast[r.ok ? "success" : "error"](r.message);
    return r;
  }, null);

  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={plan.id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        title={plan.published ? "공개 중 — 누르면 숨김" : "비공개 — 누르면 공개"}
      >
        {plan.published ? <EyeIcon /> : <EyeOffIcon />}
      </Button>
    </form>
  );
}

function EditDialog({ plan, onClose }: { plan: AdminPlan | null; onClose: () => void }) {
  const [, action, pending] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const r = await savePlan(prev, fd);
    toast[r.ok ? "success" : "error"](r.message);
    if (r.ok) onClose();
    return r;
  }, null);

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {plan && (
          <>
            <DialogHeader>
              <DialogTitle>행정계획 수정</DialogTitle>
              <DialogDescription>
                연번 {plan.seq}. 아래에서 원문 파일도 바로 올리거나 지울 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            <form action={action} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={plan.id} />
              <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
                <Field label="연번" name="seq" defaultValue={plan.seq} required />
                <Field label="계획명" name="name" defaultValue={plan.name} required />
              </div>
              <Field label="근거법률" name="law" defaultValue={plan.law} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="최신차수" name="edition" defaultValue={plan.edition} />
                <Field label="계획기간" name="period" defaultValue={plan.period} />
                <Field label="갱신주기" name="cycle" defaultValue={plan.cycle} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="소관부처" name="ministry" defaultValue={plan.ministry} />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">신뢰도</span>
                  <select
                    name="confidence"
                    defaultValue={plan.confidence ?? ""}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">—</option>
                    {CONFIDENCES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <Field label="특이사항" name="remark" defaultValue={plan.remark} />
              <Field label="출처 URL" name="sourceUrl" defaultValue={plan.sourceUrl} />
              <Field label="비고" name="note" defaultValue={plan.note} />

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={plan.published} className="size-4 accent-[var(--brand)]" />
                공개
              </label>

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>취소</Button>
                <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
              </div>
            </form>

            <DocPanel plan={plan} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** 원문 파일 올리기·지우기 — 계획 메타데이터 저장과 분리된 별도 폼 */
function DocPanel({ plan }: { plan: AdminPlan }) {
  const [, upload, uploading] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const r = await uploadPlanDoc(prev, fd);
    toast[r.ok ? "success" : "error"](r.message);
    return r;
  }, null);

  const [, remove, removing] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const r = await deletePlanDoc(prev, fd);
    toast[r.ok ? "success" : "error"](r.message);
    return r;
  }, null);

  return (
    <div className="mt-2 rounded-lg border bg-muted/40 p-3">
      <h4 className="text-sm font-semibold">원문 파일</h4>

      {plan.hasDoc && plan.docFile ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <a href={plan.docFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
            <DownloadIcon className="size-3.5" />
            {decodeURIComponent(plan.docFile.replace("/plans/", ""))}
          </a>
          <span className="num text-xs text-muted-foreground">
            {plan.docSize ? `${(plan.docSize / 1024 / 1024).toFixed(1)}MB` : ""}
          </span>
          <form action={remove} className="ml-auto">
            <input type="hidden" name="id" value={plan.id} />
            <Button type="submit" variant="ghost" size="sm" disabled={removing} className="text-destructive">
              <Trash2Icon /> 파일 삭제
            </Button>
          </form>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          원문이 없습니다. 파일을 올리면 공개 화면에 내려받기 버튼이 생깁니다.
        </p>
      )}

      <form action={upload} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={plan.id} />
        <input
          type="file"
          name="file"
          accept=".pdf,.hwp,.hwpx"
          required
          className="min-w-0 flex-1 text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2.5 file:py-1.5 file:text-xs"
        />
        <Button type="submit" size="sm" disabled={uploading}>
          <UploadIcon /> {uploading ? "올리는 중…" : plan.hasDoc ? "교체" : "올리기"}
        </Button>
      </form>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        PDF·HWP·HWPX, 80MB 이하. <strong>파일명은 자동으로 맞춰집니다</strong> —
        올린 이름 대신 <code>계획명_제N차.확장자</code> 로 저장됩니다(기존 149건과 같은 규칙).
        차수를 먼저 저장해 두면 파일명에 반영됩니다.
      </p>
    </div>
  );
}

/** 새 행정계획 등록 — 저장한 뒤 목록에서 다시 열어 원문을 올린다 */
function CreateDialog({ open, defaultSeq, onClose }: { open: boolean; defaultSeq: string; onClose: () => void }) {
  const [, action, pending] = useActionState(async (prev: ActionResult | null, fd: FormData) => {
    const r = await savePlan(prev, fd);
    toast[r.ok ? "success" : "error"](r.message);
    if (r.ok) onClose();
    return r;
  }, null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>행정계획 추가</DialogTitle>
          <DialogDescription>
            등록한 뒤 목록에서 수정을 열면 원문 파일을 올릴 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Field label="연번" name="seq" defaultValue={defaultSeq} required />
            <Field label="계획명" name="name" required />
          </div>
          <Field label="근거법률" name="law" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="최신차수" name="edition" />
            <Field label="계획기간" name="period" />
            <Field label="갱신주기" name="cycle" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="소관부처" name="ministry" />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">신뢰도</span>
              <select name="confidence" defaultValue="" className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">—</option>
                {CONFIDENCES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <Field label="특이사항" name="remark" />
          <Field label="출처 URL" name="sourceUrl" />
          <Field label="비고" name="note" />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked className="size-4 accent-[var(--brand)]" />
            공개
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "추가"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, name, defaultValue, required,
}: { label: string; name: string; defaultValue?: string | null; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <Input name={name} defaultValue={defaultValue ?? ""} required={required} />
    </label>
  );
}
