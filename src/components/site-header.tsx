import Link from "next/link";
import { TopNav, type NavTrack } from "@/components/site/top-nav";
import { LockIcon, SearchIcon } from "lucide-react";

/**
 * 상단 헤더.
 *
 * 헤더는 한 줄로 끝낸다. 소속기관 표기용 유틸리티 바를 위에 두면 세로 공간만 먹고
 * 정작 읽히지 않아서 뺐다 — 소속은 푸터에 있다.
 * 부문 색 띠(원래 엔진의 헤더 상단)도 목표색이 17개인 이 사이트에선 노이즈라 홈 히어로 아래로 옮겼다.
 */
export function SiteHeader({
  title,
  tracks,
  level1Label,
  navHidden,
  navOrder,
}: {
  title: string;
  tracks: NavTrack[];
  level1Label: string;
  /** 설정값 `nav_hidden` — 숨길 메뉴 key 목록(세미콜론 구분) */
  navHidden?: string;
  /** 설정값 `nav_order` — 메뉴 key 순서 */
  navOrder?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      {/* 메인 바 */}
      <div className="page flex items-center gap-5">
        <Link href="/" className="mr-1 flex min-w-0 shrink-0 items-center gap-2 py-3">
          <span
            className="grid size-8 shrink-0 place-items-center rounded font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
            aria-hidden
          >
            K
          </span>
          <span className="truncate text-[15px] leading-tight font-bold">{title}</span>
        </Link>

        <div className="hidden lg:block">
          <TopNav tracks={tracks} level1Label={level1Label} navHidden={navHidden} navOrder={navOrder} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/indicators"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
          >
            <SearchIcon className="size-3.5" /> 지표 검색
          </Link>
          <Link
            href="/admin"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            title="관리자"
          >
            <LockIcon className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* 좁은 화면에서는 내비를 아래 줄로 내린다 */}
      <div className="page border-t pb-1 lg:hidden">
        <TopNav tracks={tracks} level1Label={level1Label} navHidden={navHidden} navOrder={navOrder} />
      </div>
    </header>
  );
}
