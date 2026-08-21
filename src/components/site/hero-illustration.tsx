import Link from "next/link";
import { cn } from "@/lib/utils";

interface RingGoal { no: string; name: string; color: string; progress: number | null; count: number }

const TAU = Math.PI * 2;

/** 도넛 조각 하나의 path. 각도는 12시 방향에서 시계방향. */
function arc(startDeg: number, endDeg: number, rOuter: number, rInner: number, cx = 100, cy = 100) {
  const a = (d: number) => ((d - 90) / 360) * TAU;
  const p = (r: number, d: number) => [cx + r * Math.cos(a(d)), cy + r * Math.sin(a(d))];
  const [x1, y1] = p(rOuter, startDeg);
  const [x2, y2] = p(rOuter, endDeg);
  const [x3, y3] = p(rInner, endDeg);
  const [x4, y4] = p(rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${x1} ${y1}A${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}Z`;
}

/**
 * 히어로 일러스트 — 직접 그린 인라인 SVG (외부 이미지 없음).
 *
 * 원 안쪽은 지속가능발전 장면(해·산·숲·풍력·도시·물),
 * 바깥 테두리는 17개 목표의 달성도 링이다. 조각 두께가 그 목표의 평균 달성도이고
 * 조각을 누르면 해당 목표로 이동한다. 그림과 데이터를 한 덩어리로 보여준다.
 */
export function HeroIllustration({
  goals,
  average,
  className,
}: {
  goals: RingGoal[];
  average: number | null;
  className?: string;
}) {
  const n = goals.length || 1;
  const step = 360 / n;
  const gap = 1.4;
  const R = 97;      // 링 바깥
  const rIn = 86;    // 링 안쪽
  const track = 2.5; // 0%일 때도 남는 최소 두께

  return (
    <div className={cn("relative aspect-square w-full", className)}>
      <svg viewBox="0 0 200 200" className="size-full overflow-visible" role="img"
           aria-label="지속가능발전 이미지와 17개 목표별 달성도">
        <defs>
          <clipPath id="hi-scene"><circle cx="100" cy="100" r="80" /></clipPath>

          <linearGradient id="hi-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CDEBF7" />
            <stop offset="55%" stopColor="#EAF4E7" />
            <stop offset="100%" stopColor="#FDF3D8" />
          </linearGradient>
          <radialGradient id="hi-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD760" />
            <stop offset="100%" stopColor="#FDB714" />
          </radialGradient>
          <radialGradient id="hi-sunglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDB714" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FDB714" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hi-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ADD8" />
            <stop offset="100%" stopColor="#007DBB" />
          </linearGradient>
        </defs>

        {/* ── 원 안쪽 장면 ── */}
        <g clipPath="url(#hi-scene)">
          <rect x="20" y="20" width="160" height="160" fill="url(#hi-sky)" />

          {/* 해 */}
          <circle cx="140" cy="58" r="34" fill="url(#hi-sunglow)" />
          <circle cx="140" cy="58" r="15" fill="url(#hi-sun)" />

          {/* 새 */}
          <g stroke="#48773C" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.55">
            <path d="M52 52c2-2.4 4-2.4 6 0" />
            <path d="M58 52c2-2.4 4-2.4 6 0" />
            <path d="M68 44c1.6-1.9 3.2-1.9 4.8 0" />
          </g>

          {/* 먼 산 */}
          <path d="M20 118C44 96 62 112 84 100s34 4 52-4 26 4 44-2v90H20z" fill="#8FD18A" opacity="0.75" />
          {/* 중간 언덕 */}
          <path d="M20 132C46 114 66 128 90 118s36 8 54 0 24 6 36 2v70H20z" fill="#40AE49" />

          {/* 풍력 발전기 — 중간 언덕 위 */}
          <g stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.95">
            <path d="M56 124V104" />
            <path d="M56 104l-9-6M56 104l10-5M56 104l1 11" />
            <path d="M76 128v-14" />
            <path d="M76 114l-7-4M76 114l7-4M76 114v8" />
          </g>
          <circle cx="56" cy="104" r="1.6" fill="#FFFFFF" />
          <circle cx="76" cy="114" r="1.3" fill="#FFFFFF" />

          {/* 도시 — 오른쪽 */}
          <g fill="#2D9A47" opacity="0.9">
            <rect x="132" y="104" width="9" height="24" rx="1.2" />
            <rect x="143" y="112" width="7" height="16" rx="1.2" />
            <rect x="152" y="98" width="10" height="30" rx="1.2" />
            <rect x="164" y="110" width="7" height="18" rx="1.2" />
          </g>
          <g fill="#FDF3D8" opacity="0.85">
            <rect x="134.5" y="108" width="2" height="2.6" /><rect x="137.5" y="108" width="2" height="2.6" />
            <rect x="134.5" y="114" width="2" height="2.6" /><rect x="137.5" y="114" width="2" height="2.6" />
            <rect x="154.5" y="103" width="2" height="2.6" /><rect x="157.5" y="103" width="2" height="2.6" />
            <rect x="154.5" y="109" width="2" height="2.6" /><rect x="157.5" y="109" width="2" height="2.6" />
            <rect x="145.5" y="117" width="2" height="2.6" />
          </g>

          {/* 앞 언덕 */}
          <path d="M20 146C48 128 72 144 98 134s38 10 58 2 12 4 24 2v54H20z" fill="#48773C" />

          {/* 나무 */}
          <g>
            <path d="M42 152v-9" stroke="#3B2F16" strokeWidth="2" strokeLinecap="round" />
            <circle cx="42" cy="138" r="8" fill="#2D9A47" />
            <circle cx="36.5" cy="142" r="5.5" fill="#40AE49" />
            <circle cx="47" cy="142.5" r="5" fill="#40AE49" />
          </g>
          <g>
            <path d="M112 150v-7" stroke="#3B2F16" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="112" cy="139" r="6.5" fill="#40AE49" />
            <circle cx="107.5" cy="142.5" r="4.2" fill="#56C02B" />
          </g>

          {/* 물 */}
          <path d="M20 156h160v24H20z" fill="url(#hi-water)" />
          <path d="M20 156C48 150 70 162 98 156s44 8 82 0v6c-38 8-54-4-82 2s-50-6-78 0z" fill="#00ADD8" opacity="0.55" />
          <g stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.5">
            <path d="M40 168c3-2.4 6-2.4 9 0s6 2.4 9 0" />
            <path d="M104 174c3-2.4 6-2.4 9 0s6 2.4 9 0" />
            <path d="M70 176c2.6-2.2 5.2-2.2 7.8 0" />
          </g>

          {/* 해가 물에 비치는 빛 */}
          <ellipse cx="140" cy="164" rx="13" ry="2.6" fill="#FFD760" opacity="0.5" />
        </g>

        {/* 장면 테두리 */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="100" cy="100" r="81.5" fill="none" stroke="currentColor" className="text-foreground" strokeOpacity="0.08" strokeWidth="1" />

        {/* ── 바깥 달성도 링 ── */}
        {goals.map((g, i) => {
          const s = i * step + gap / 2;
          const e = (i + 1) * step - gap / 2;
          const filled = rIn + track + ((R - rIn - track) * (g.progress ?? 0)) / 100;
          return (
            <Link key={g.no} href={`/goals/${g.no}`} aria-label={`목표 ${g.no} ${g.name}`}>
              <g className="origin-center transition-transform duration-200 hover:scale-[1.03]">
                <title>{`${g.no}. ${g.name} — 지표 ${g.count}개${g.progress === null ? "" : ` · 달성도 ${Math.round(g.progress)}%`}`}</title>
                <path d={arc(s, e, R, rIn)} fill={g.color} opacity={0.2} />
                <path d={arc(s, e, filled, rIn)} fill={g.color} />
              </g>
            </Link>
          );
        })}
      </svg>

      {/* 전체 달성도 배지 */}
      <div className="absolute right-0 bottom-1 rounded-full border bg-background/95 px-3 py-1.5 text-center shadow-sm backdrop-blur">
        <div className="num text-lg leading-none font-bold">{average === null ? "—" : `${Math.round(average)}%`}</div>
        <div className="mt-0.5 text-[10px] whitespace-nowrap text-muted-foreground">전체 달성도</div>
      </div>
    </div>
  );
}
