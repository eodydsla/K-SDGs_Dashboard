# 국가지속가능발전목표(K-SDGs) 이행현황

국가지속가능발전연구센터(국무조정실 · 한국환경연구원)의 K-SDGs 지표 대시보드입니다.
제4차 지속가능발전 기본계획(2021~2040)의 **17개 목표 · 119개 세부목표 · 236개 지표**를 다룹니다.

## 실행

```bash
npm install                 # postinstall 로 prisma generate 실행
npm run fix:node18          # Node 18 + linux x64 인 경우 한 번만
cp .env.example .env        # DATABASE_URL / ADMIN_PASSWORD / SESSION_SECRET

npm run db:push && npm run db:seed
PORT=8007 npm run dev       # http://localhost:8007
```

운영 빌드는 `npm run build && npm start`. **dev 서버를 끄고** 실행하세요(`.next` 공유 충돌).

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 지표 검색 · 17개 목표 그리드 · 전체 이행 현황 매트릭스 |
| `/goals`, `/goals/13` | 목표 목록 / 목표 상세 (세부목표 · 지표 마일스톤) |
| `/indicators` | 236개 지표 탐색 — 목표·상태 필터, 검색, 상세 드로어 |
| `/areas/environment` | 부문(계획 2부 Ⅰ~Ⅳ) 단위 현황 |
| `/about`, `/about/sd`, `/about/ksdgs` | 센터 소개 · 지속가능발전 개요 · K-SDGs 개요 |
| `/data` | CSV 내려받기 · 소관부처별 분포 · 방법론 |
| `/admin` | 지표·값 편집, CSV 가져오기/내보내기 (기본 비밀번호는 `.env`) |

## 데이터

지표 수치는 제4차 지속가능발전 기본계획 원문에서 추출한 값입니다.
소관부처가 공표하는 최신 통계와 다를 수 있으며, **대외 공개 전 소관 부서 검수가 필요합니다.**

```bash
npx tsx scripts/build-sheets.ts   # 원문 JSON → sheets/*.csv 재생성
npm run db:seed
```

`scripts/build-sheets.report.md`에 수기 확인이 필요한 항목이 정리됩니다.

### 저장소에 없는 것

용량 때문에 두 가지는 커밋하지 않습니다. 없어도 앱은 뜨고, 해당 화면만 비어 보입니다.

| 경로 | 크기 | 복구 방법 |
|---|---|---|
| `public/plans/` | 약 1GB (행정계획 원문 PDF 149건) | 원본 폴더를 `PLANS_DIR`로 지정해 `npx tsx scripts/build-plans.ts` |
| `data/kosis-tables.json` | 67MB (KOSIS 통계표 238,321건) | KOSIS 통계표 트리 API 재수집 후 `npx tsx scripts/build-kosis-links.ts` |

원문에 수치 목표가 없는 지표가 상당수입니다(정량 107 / 정성 97 / 모니터링 26 / 통계미구축 6).
「지속 감소」 같은 서술형 목표는 숨기지 않고 원문 그대로 표시합니다.

연도별 시계열은 아직 기준연도 한 점뿐입니다(164행). KOSIS·e-나라지표 연동으로 순차 보강할 예정입니다.

## 구조

`../ep_dashboard` 엔진을 포크했습니다. 자세한 개발 지침은 `CLAUDE.md`,
포크 이전 엔진의 설계 기록은 `docs/engine/`에 있습니다.
