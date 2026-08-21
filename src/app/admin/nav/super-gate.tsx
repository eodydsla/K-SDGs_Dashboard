"use client";

import { superLoginAction } from "@/lib/admin-actions";
import { AdminForm, SubmitButton } from "@/components/admin/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldIcon } from "lucide-react";

/** 관리자 로그인 위에 한 겹 더 — 슈퍼관리자 비밀번호 확인 */
export function SuperGate({ count, shown }: { count: number; shown: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
          <ShieldIcon className="size-4.5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">슈퍼관리자 인증</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            현재 전체 {count}개 중 {shown}개가 노출 중입니다. 메뉴를 바꾸려면 비밀번호를 입력하세요 —
            인증은 30분간 유지되고, 로그아웃하면 함께 풀립니다.
          </p>
          <AdminForm action={superLoginAction} className="mt-4 flex flex-col gap-3 sm:max-w-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="super_password" className="text-xs">
                슈퍼관리자 비밀번호
              </Label>
              <Input
                id="super_password"
                name="password"
                type="password"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
            <SubmitButton>확인</SubmitButton>
          </AdminForm>
        </div>
      </div>
    </div>
  );
}
