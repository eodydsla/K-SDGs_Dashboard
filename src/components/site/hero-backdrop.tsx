/**
 * 히어로 배경 그래픽 — 순수 인라인 SVG. 외부 이미지 파일이 없다.
 *
 * 지속가능발전의 세 축(사회·경제·환경)을 겹쳐 흐르는 곡선으로,
 * 목표 체계를 옅은 동심원으로 암시한다. 본문 대비를 해치지 않도록
 * 전부 낮은 불투명도로 깔고, 위쪽으로 갈수록 배경색에 녹아들게 마스크를 준다.
 */
export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg
        className="size-full"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 아래로 갈수록 진해지는 마스크 — 제목 뒤가 깨끗하게 남는다 */}
          <linearGradient id="hb-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="hb-mask">
            <rect width="1440" height="400" fill="url(#hb-fade)" />
          </mask>

          <linearGradient id="hb-social" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F6FB8" />
            <stop offset="100%" stopColor="#26BDE2" />
          </linearGradient>
          <linearGradient id="hb-economy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FD9D24" />
            <stop offset="100%" stopColor="#DDA63A" />
          </linearGradient>
          <linearGradient id="hb-planet" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#2F9E44" />
            <stop offset="100%" stopColor="#56C02B" />
          </linearGradient>

          <radialGradient id="hb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0F6FB8" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0F6FB8" stopOpacity="0" />
          </radialGradient>

          <pattern id="hb-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" opacity="0.5" />
          </pattern>
        </defs>

        <g mask="url(#hb-mask)">
          {/* 은은한 빛무리 */}
          <circle cx="1180" cy="100" r="300" fill="url(#hb-glow)" />
          <circle cx="160" cy="330" r="240" fill="url(#hb-glow)" />

          {/* 점 격자 — 데이터 플랫폼의 결 */}
          <rect x="0" y="0" width="1440" height="400" fill="url(#hb-dots)" className="text-foreground" opacity="0.07" />

          {/* 목표 체계를 암시하는 동심원 */}
          <g fill="none" stroke="currentColor" className="text-brand" opacity="0.16">
            <circle cx="1215" cy="180" r="95" strokeWidth="1" />
            <circle cx="1215" cy="180" r="146" strokeWidth="1" strokeDasharray="3 7" />
            <circle cx="1215" cy="180" r="199" strokeWidth="1" strokeDasharray="2 10" />
          </g>

          {/* 세 축이 겹쳐 흐르는 곡선 — 사회 · 경제 · 환경 */}
          <path
            d="M0 268C168 234 300 292 468 282S760 222 928 234s268 60 512 30v106H0z"
            fill="url(#hb-social)"
            opacity="0.13"
          />
          <path
            d="M0 302C190 273 322 331 496 317s286-52 470-40 300 54 474 24v79H0z"
            fill="url(#hb-economy)"
            opacity="0.13"
          />
          <path
            d="M0 338C205 311 356 361 540 348s300-46 486-34 268 48 414 22v54H0z"
            fill="url(#hb-planet)"
            opacity="0.16"
          />
        </g>
      </svg>
    </div>
  );
}
