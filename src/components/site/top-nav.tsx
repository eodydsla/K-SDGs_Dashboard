"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNavItems } from "@/lib/nav-items";
import { ChevronDownIcon, LayoutGridIcon, GlobeIcon, LandmarkIcon, FileTextIcon, TrendingUpIcon, Share2Icon, type LucideIcon } from "lucide-react";

export interface NavGoal { no: string; name: string; color: string; icon: string | null }
export interface NavTrack { code: string; name: string; goals: NavGoal[] }

/**
 * 상단 메인 내비.
 *
 * 부문(Track)에서 메뉴를 자동 생성하던 원래 방식 대신 고정 4항목으로 간다.
 * 부문 이름 4개가 메뉴에 나열되면 무엇을 볼 수 있는지 전달되지 않고,
 * 사용자가 실제로 찾는 단위는 "목표 13 기후변화"이기 때문이다.
 * 대신 K-SDGs 항목에 17개 목표를 부문별 열로 펼치는 메가메뉴를 붙였다.
 *
 * 항목 목록은 `lib/nav-items.ts`, 노출 여부는 설정값 `nav_hidden`(관리자 → 사이트 설정)에서 온다.
 */
const NAV_ICON: Record<string, LucideIcon> = {
  home: LayoutGridIcon,
  goals: GlobeIcon,
  futures: TrendingUpIcon,
  datamap: Share2Icon,
  plans: FileTextIcon,
  about: LandmarkIcon,
};

export function TopNav({
  tracks,
  level1Label,
  navHidden,
  navOrder,
}: {
  tracks: NavTrack[];
  level1Label: string;
  navHidden?: string;
  navOrder?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = visibleNavItems(navHidden, navOrder);
  if (!items.length) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="relative flex items-center gap-0.5" onMouseLeave={() => setOpen(false)}>
      {items.map((item) => {
        const active = isActive(item.href, item.exact) || (item.mega && pathname.startsWith("/areas/"));
        const Icon = NAV_ICON[item.key] ?? GlobeIcon;
        return (
          <div key={item.href} onMouseEnter={() => setOpen(!!item.mega)}>
            <Link
              href={item.href}
              onFocus={() => setOpen(!!item.mega)}
              className={cn(
                "group/nav relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-brand-tint text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-brand" : "text-muted-foreground/70 group-hover/nav:text-foreground")} />
              {item.label}
              {item.mega && <ChevronDownIcon className={cn("size-3.5 opacity-60 transition-transform", open && "rotate-180")} />}
            </Link>
          </div>
        );
      })}

      {open && (
        <div className="absolute top-[calc(100%+0.35rem)] left-0 z-50 w-max max-w-[min(72rem,88vw)] rounded-xl border bg-background p-5 shadow-xl">
          <div className="flex flex-wrap gap-x-8 gap-y-5">
            {tracks.map((t) => (
              <div key={t.code} className="min-w-44">
                <Link
                  href={`/areas/${t.code}`}
                  className="mb-2 block border-b pb-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  {t.name}
                </Link>
                <ul className="flex flex-col gap-0.5">
                  {t.goals.map((g) => (
                    <li key={g.no}>
                      <Link
                        href={`/goals/${g.no}`}
                        className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] transition-colors hover:bg-muted"
                      >
                        <Image
                          src={`/ksdgs/goal-${String(g.no).padStart(2, "0")}.svg`}
                          alt=""
                          width={127}
                          height={127}
                          unoptimized
                          className="size-6 shrink-0 rounded-[3px]"
                        />
                        <span className="truncate">{g.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs">
            <Link href="/goals" className="font-medium text-brand hover:underline">17개 {level1Label} 전체 →</Link>
            <Link href="/indicators" className="font-medium text-brand hover:underline">지표 찾기 →</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
