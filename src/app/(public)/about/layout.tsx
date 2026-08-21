import { NavLinks } from "@/components/nav-links";

export const dynamic = "force-dynamic";

/** 소개 영역 공통 껍데기 — 본문 폭을 좁혀 읽기 좋게 하고, 좌측에 소절 목차를 둔다. */
export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page py-8">
      <NavLinks
        className="mb-6 border-b pb-2"
        items={[
          { href: "/about", label: "센터 소개", exact: true },
          { href: "/about/sd", label: "지속가능발전이란" },
          { href: "/about/ksdgs", label: "K-SDGs 개요" },
        ]}
      />
      <article className="prose-ncsd max-w-4xl">{children}</article>
    </div>
  );
}
