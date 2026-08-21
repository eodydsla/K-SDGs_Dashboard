"use client";

import { useState } from "react";
import { saveNavSettings, superLogoutAction } from "@/lib/admin-actions";
import { AdminForm, SubmitButton } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon, HouseIcon, ShieldCheckIcon } from "lucide-react";

export interface NavRow {
  key: string;
  label: string;
  href: string;
  desc: string;
  visible: boolean;
}

/**
 * 체크박스로 노출 여부, ↑↓ 로 순서를 정한다.
 *
 * 순서를 폼에 담는 방식은 항목별 숫자 입력이 아니라 **정렬된 key 목록 하나**다.
 * 숫자를 쓰면 중복·건너뛴 값이 생겨 사용자가 결과를 예측할 수 없다.
 * 체크 해제된 항목도 목록에는 남으므로 다시 켰을 때 자리를 그대로 되찾는다.
 */
export function NavEditor({
  items,
  remaining,
  home,
}: {
  items: NavRow[];
  remaining: number;
  home: string;
}) {
  const [rows, setRows] = useState<NavRow[]>(items);
  const [homeKey, setHomeKey] = useState(home);

  const move = (i: number, d: -1 | 1) =>
    setRows((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // 숨기면 첫 화면 지정도 함께 풀린다 — 그대로 두면 아무도 못 가는 주소가 첫 화면이 된다
  const toggle = (i: number) =>
    setRows((prev) => {
      const next = prev.map((r, k) => (k === i ? { ...r, visible: !r.visible } : r));
      if (!next[i].visible && next[i].key === homeKey) setHomeKey("");
      return next;
    });

  const shown = rows.filter((r) => r.visible).length;
  const effectiveHome = rows.find((r) => r.key === homeKey && r.visible) ?? rows.find((r) => r.visible);
  const minutes = Math.max(1, Math.round(remaining / 60));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-xs">
        <ShieldCheckIcon className="size-4 text-emerald-700" />
        <span className="font-medium text-emerald-800 dark:text-emerald-300">슈퍼관리자로 인증됨</span>
        <span className="text-muted-foreground">약 {minutes}분 남음</span>
        <form action={superLogoutAction} className="ml-auto">
          <Button type="submit" variant="ghost" size="sm">
            권한 해제
          </Button>
        </form>
      </div>

      <AdminForm action={saveNavSettings} className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <input type="hidden" name="order" value={rows.map((r) => r.key).join(";")} />
        <input
          type="hidden"
          name="hidden"
          value={rows.filter((r) => !r.visible).map((r) => r.key).join(";")}
        />
        <input type="hidden" name="home" value={effectiveHome?.key ?? ""} />

        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5 transition-colors",
                !r.visible && "bg-muted/40 opacity-60",
              )}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={r.visible}
                  onChange={() => toggle(i)}
                  className="size-4 shrink-0 accent-foreground"
                />
                <span className="grid size-6 shrink-0 place-items-center rounded bg-muted text-[11px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {r.label}
                    {r.visible ? (
                      <EyeIcon className="size-3.5 text-muted-foreground" />
                    ) : (
                      <EyeOffIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    <code>{r.href}</code> · {r.desc}
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
                  effectiveHome?.key === r.key
                    ? "border-brand/40 bg-brand-tint text-brand"
                    : "text-muted-foreground hover:bg-muted",
                  !r.visible && "pointer-events-none opacity-40",
                )}
                title="이 메뉴를 첫 화면으로"
              >
                <input
                  type="radio"
                  name="home_pick"
                  checked={effectiveHome?.key === r.key}
                  disabled={!r.visible}
                  onChange={() => setHomeKey(r.key)}
                  className="size-3.5 accent-current"
                />
                <HouseIcon className="size-3.5" />
                <span className="hidden sm:inline">첫 화면</span>
              </label>

              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="outline" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">
                  <ArrowUpIcon />
                </Button>
                <Button type="button" variant="outline" size="icon" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="아래로">
                  <ArrowDownIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>메뉴 설정 저장</SubmitButton>
          <span className="text-xs text-muted-foreground">
            {rows.length}개 중 {shown}개 노출 · 첫 화면 <b className="text-foreground">{effectiveHome?.label ?? "—"}</b>
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground">
          첫 화면으로 지정한 메뉴는 사이트 주소(<code>/</code>)와 로고를 눌렀을 때 열립니다.
          숨긴 메뉴는 헤더에서 빠질 뿐 주소를 직접 입력하면 열립니다 — 페이지 자체를 막으려면 별도 처리가 필요합니다.
        </p>
      </AdminForm>
    </div>
  );
}
