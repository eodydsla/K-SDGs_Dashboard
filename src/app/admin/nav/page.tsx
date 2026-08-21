import { getConfig } from "@/lib/data";
import { isSuperAdmin, superSessionRemaining } from "@/lib/auth";
import { NAV_ITEMS, homeNavItem, orderedNavItems, parseHiddenNav } from "@/lib/nav-items";
import { SuperGate } from "./super-gate";
import { NavEditor } from "./nav-editor";

export const dynamic = "force-dynamic";

export default async function AdminNavPage() {
  const config = await getConfig();
  const superOk = await isSuperAdmin();
  const remaining = await superSessionRemaining();

  const hidden = parseHiddenNav(config.nav_hidden);
  const items = orderedNavItems(config.nav_order).map((it) => ({
    key: it.key,
    label: it.label,
    href: it.href,
    desc: it.desc,
    visible: !hidden.has(it.key),
  }));

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">상단 메뉴</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          공개 사이트 헤더에 어떤 메뉴를 어떤 순서로 보일지, 그리고 어떤 메뉴가 첫 화면이 될지 정합니다.
          사이트 전체에 걸치는 설정이라 <b>슈퍼관리자 비밀번호</b>를 한 번 더 확인합니다.
        </p>
      </div>

      {superOk ? (
        <NavEditor
          items={items}
          remaining={remaining}
          home={homeNavItem(config.nav_hidden, config.nav_order, config.nav_home)?.key ?? ""}
        />
      ) : (
        <SuperGate count={NAV_ITEMS.length} shown={items.filter((i) => i.visible).length} />
      )}
    </div>
  );
}
