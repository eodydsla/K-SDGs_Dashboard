import { getDashboard } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { tracks, config } = await getDashboard();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader
        title={config.org_name || config.site_title}
        level1Label={config.level1_label}
        navHidden={config.nav_hidden}
        navOrder={config.nav_order}
        tracks={tracks.map((t) => ({
          code: t.code,
          name: t.name,
          goals: t.goals.map((g) => ({ no: g.no, name: g.name, color: g.color, icon: g.icon })),
        }))}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter config={config} />
    </div>
  );
}
