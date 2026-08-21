"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

/** 홈 히어로 — 큰 검색바 하나가 이 사이트의 첫 동작이 되게 한다. */
export function HeroSearch({
  headline,
  sub,
  keywords,
  placeholder,
}: {
  headline: string;
  sub: string;
  keywords: string[];
  placeholder: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <div className="flex flex-col items-start text-left">
      <h1 className="text-[24px] leading-tight font-bold text-balance sm:text-[30px] xl:text-[34px]">{headline}</h1>
      <p className="mt-2.5 text-sm text-muted-foreground sm:text-base">{sub}</p>

      <form
        className="mt-4 w-full"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(q.trim() ? `/indicators?q=${encodeURIComponent(q.trim())}` : "/indicators");
        }}
      >
        <div className="flex h-11 w-full items-center gap-2 rounded-full border-2 bg-background pr-1.5 pl-5 shadow-sm transition-colors focus-within:border-brand sm:h-12">
          <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label="지표 검색"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-deep"
          >
            검색
          </button>
        </div>
      </form>

      {keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">많이 찾는 지표</span>
          {keywords.map((k) => (
            <Link
              key={k}
              href={`/indicators?q=${encodeURIComponent(k)}`}
              className="rounded-full border px-3 py-1 transition-colors hover:border-brand hover:text-brand"
            >
              {k}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
