import Link from "next/link";

const LINKS = [
  { label: "지속가능발전포털", href: "https://www.ncsd.go.kr" },
  { label: "e-나라지표 · 국가지표체계", href: "https://www.index.go.kr" },
  { label: "한국환경연구원(KEI)", href: "https://www.kei.re.kr" },
  { label: "국무조정실", href: "https://www.opm.go.kr" },
];

export function SiteFooter({ config }: { config: Record<string, string> }) {
  return (
    <footer className="mt-auto border-t bg-muted">
      <div className="page grid gap-8 py-10 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-sm font-bold text-foreground">{config.org_name}</p>
          {config.org_parent && <p className="mt-1">{config.org_parent}</p>}
          {config.contact && <p className="mt-2">{config.contact}</p>}
        </div>

        <div>
          <p className="mb-2 font-semibold text-foreground">관련 사이트</p>
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noreferrer noopener" className="hover:text-foreground hover:underline">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 font-semibold text-foreground">이 사이트</p>
          <ul className="flex flex-col gap-1">
            <li><Link href="/goals" className="hover:text-foreground hover:underline">국가지속가능발전목표</Link></li>
            <li><Link href="/indicators" className="hover:text-foreground hover:underline">지표 찾기</Link></li>
            <li><Link href="/about/ksdgs" className="hover:text-foreground hover:underline">K-SDGs 개요</Link></li>
            <li><Link href="/data" className="hover:text-foreground hover:underline">데이터 내려받기</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="page flex flex-col gap-1 py-4 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {config.framework_name && <span className="font-medium text-foreground">{config.framework_name}</span>}
            {config.data_status && <span>{config.data_status}</span>}
            {config.last_updated && <span>최종 갱신 {config.last_updated}</span>}
          </div>
          {config.footer_note && <p className="max-w-4xl leading-relaxed">{config.footer_note}</p>}
        </div>
      </div>
    </footer>
  );
}
