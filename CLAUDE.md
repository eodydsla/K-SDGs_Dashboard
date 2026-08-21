# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

국가지속가능발전연구센터 K-SDGs 이행현황 포털 — 공개 대시보드 + 관리자 CRUD를 한 Next.js 앱에 합친 구조.

`../ep_dashboard`(환경계획 모니터링 대시보드)를 포크해 지속가능발전 쪽으로 바꾼 것이다.
엔진 계층(`lib/`, `components/`, 관리자)은 대부분 그대로고, 데이터·메뉴·디자인이 교체됐다.
포크 이전의 설계 기록은 `docs/engine/`(PRD·PLAN·REQUIREMENTS)에 남겨 뒀다 — **현재 사이트 명세가 아니라 엔진 배경 자료다.**

## 이 사이트가 다루는 것

제4차 지속가능발전 기본계획(2021~2040)의 **17개 목표 · 119개 세부목표 · 236개 지표**.
계층은 `부문(Track) > 목표 > 세부목표 > 지표 > 연도별값`이고, 부문은 계획 2부의 Ⅰ~Ⅳ다.

## Commands

```bash
PORT=8007 npm run dev       # 개발 서버 (ep_dashboard가 8006을 쓰므로 8007 사용)
npx tsx scripts/build-sheets.ts  # 기본계획 원문 JSON → sheets/*.csv 재생성
npm run build && npm start  # 운영 빌드·실행
npm run lint                # eslint
npx tsc --noEmit            # 타입체크 (빌드 전 빠른 확인용)

npm run db:push             # prisma/schema.prisma → SQLite 반영
npm run db:seed             # sheets/*.csv → DB (기존 데이터 전부 삭제 후 재주입)
npm run db:studio           # Prisma Studio
```

`npm run db:reset`은 `prisma db push --force-reset`이라 Prisma가 AI 에이전트 실행을 막는다.
스키마를 바꿨을 때는 `npm run db:push && npm run db:seed`를 쓰면 된다 —
시드가 어차피 전체 삭제 후 재주입하므로 결과가 같다.

**dev 서버를 켜둔 채 `npm run build`를 실행하지 말 것.** 둘 다 `.next`를 쓰기 때문에 실행 중인 dev 서버가
`MODULE_NOT_FOUND` / `Cannot read properties of undefined (reading '/_app')`로 깨진다. 그렇게 됐으면
`rm -rf .next` 후 재시작.

**자동화된 테스트 스위트가 없다.** 검증은 서버를 띄운 뒤 렌더된 HTML에서 `<form>`의 `$ACTION_*` 히든 필드를
추출해 그대로 재전송하는 방식으로 했다. 수용 기준 20개 항목은 `REQUIREMENTS.md` 14장에 있다.
서버 액션은 `useActionState` 시그니처(`(prevState, formData)`)라 히든 필드 없이 POST하면
`fd.get is not a function`이 난다.

### Node 버전

Node 20+ 권장. Node 18에서는 Tailwind v4 네이티브 모듈(`@tailwindcss/oxide`)이 engines 불일치로
조용히 건너뛰어져 빌드 시 `Cannot find native binding`이 난다 → `npm run fix:node18` 한 번 실행.
플랫폼 전용 패키지는 반드시 `optionalDependencies`에 둘 것(`dependencies`에 넣으면 다른 OS에서
`npm install` 자체가 실패).

## Architecture

### 무엇을 하드코딩해도 되고, 무엇은 안 되는가

포크 이전 엔진의 최우선 제약은 "코드에 K-SDGs를 하드코딩하지 않는다"였다.
**이 저장소에서는 그 전제가 뒤집힌다.** 이 앱은 K-SDGs 전용이고, 17개 목표 체계는
제4차 기본계획이 적용되는 2040년까지 고정이다. 그래서 17칸 그리드처럼 구조를 전제한 UI를 만들어도 된다.

**해도 되는 것**
- 17개 목표를 전제한 레이아웃(`goal-grid.tsx`의 5~6열 타일, `goal-matrix.tsx`의 17행)
- UN 공식 목표색을 값으로 다루는 것 — 단, 출처는 `sheets/goals.csv`의 `color`이고 코드가 아니다
- 2030(중간)·2040(장기) 두 목표연도를 전제한 컴포넌트

**여전히 하면 안 되는 것**
- 계층 명칭을 화면에 직접 쓰는 것. "부문"·"목표"·"세부목표"·"지표"는 전부
  `Config`의 `level0_label`~`level3_label`에서 온다 (`config.level3_label`).
- `13`·`G13`·`"environment"` 같은 **개별 코드가 로직에 등장하는 것**. 부문 코드는 `Track.code`에서 오고
  라우팅(`/areas/[track]`), 메뉴, 필터가 전부 여기에 의존한다.
- 지표 개수·세부목표 개수를 상수로 박는 것. 화면에 보이는 17/119/236은 전부 DB를 세어 만든다
  (`/about/ksdgs`가 이 원칙의 예시다).
- `lib/progress.ts`의 `STATUSES`에 상태를 추가하는 것. 6개 상태가 `STATUS_META`·`summary-cards`·
  모든 누적 막대에 박혀 있다. 정성 지표는 상태가 아니라 `kind`/`targetLabel`로 구분한다.

### 데이터의 성격 — 설계를 좌우하는 두 가지

**1. 시계열이 아니라 마일스톤이다.** 기본계획 원문은 지표당 기준값 한 점과 2030·2040 목표만 준다.
실적값은 236개 지표에 164행뿐이다. 그래서 기본 시각화가 꺾은선이 아니라 불릿 차트
(`components/milestone-bar.tsx`)이고, 실적점이 1개면 `indicator-drawer`가 추이 차트 대신 이걸 보여준다.

**2. 목표의 40%가 서술형이다.** 236개 중 정량 107 / 정성 97 / 모니터링 26 / 통계미구축 6.
"지속 감소"·"안정적 유지"·"기반 마련" 같은 목표는 진행률을 낼 수 없다.
이때 숫자 자리를 `—`로 비워두면 자료 누락처럼 보이므로, `targetLabel`/`longLabel`의 원문을
칩으로 반드시 노출한다. `MilestoneBar`가 두 경우를 모두 처리하므로 새로 분기하지 말고 이걸 쓸 것.

### 데이터 흐름

```
Prisma (SQLite)
  └─ lib/data.ts  getDashboard(includeUnpublished)
       ├─ Track ⊃ Goal ⊃ Target ⊃ Indicator ⊃ IndicatorValue 를 한 번에 조회
       ├─ 각 Indicator 에 compute() 결과를 붙임 (lib/progress.ts)
       ├─ 목표색·톤을 지표까지 평탄화해 내려줌 (color, tone, goalName, targetCode …)
       ├─ 이행과제는 goal→track 을 되짚어 각 Track.actions 에 배분
       └─ DashTrack / DashGoal / DashIndicator / DashAction / config 반환
  └─ findTrack(dashboard, code) 로 URL 의 부문 코드를 해석 (없으면 notFound())
  └─ findGoal(dashboard, no) 로 /goals/13 의 목표 번호를 해석
  └─ 서버 컴포넌트가 받아 클라이언트 컴포넌트에 props 로 전달
```

`getDashboard(true)`는 임시저장(`published=false`) 항목까지 포함한다. 관리자 화면과 `/admin/preview`만
`true`를 쓰고, 공개 화면은 기본값(`false`).

`DashIndicator`는 상위 계층 정보(trackCode·goalName·targetCode·color·tone)를 **평탄화해서** 들고 있다.
필터·카드에서 매번 조인을 되짚지 않기 위한 의도이므로 유지할 것.

### 달성도 계산 — `src/lib/progress.ts` 한 곳에서만

```
진행률(%)     = (최신값 − 기준값) ÷ (목표값 − 기준값) × 100
기대진행률(%) = (최신 데이터 연도 − 기준연도) ÷ (목표연도 − 기준연도) × 100
```

- 분모의 부호가 증감 방향을 자동 흡수하므로 `direction`(up/down)은 **계산에 쓰지 않는다**.
  추세 화살표 색과 안내 문구에만 쓴다.
- 기대진행률은 **현재연도가 아니라 최신 데이터 연도** 기준. 통계 공표가 1~2년 늦는 지표를
  현재연도 기대치와 비교하면 정상 지표까지 전부 「지연」으로 찍힌다. 이 규칙을 바꾸지 말 것.
- 상태 6종(달성/순조/지연/악화/모니터링/자료없음)과 색은 `STATUS_META`에 있다.
  상태색은 전 화면에서 동일 의미로만 쓰고 변주하지 않는다.

### 색상 2층 구조 — `src/lib/colors.ts`

- **목표색(다양성)**: 색 하나를 HSL로 분해해 `tint`/`border`/`text`/`deep`/투명도 3단계를 파생.
  헤더 그라디언트·카드 액센트 바·도넛·차트·필터 칩에 전파된다.
- **상태색(일관성)**: `STATUS_META`. 절대 변주 금지.

`Tones`는 **전부 문자열이어야 한다.** 함수(`alpha(a) => string` 같은)를 넣으면 서버 컴포넌트에서
클라이언트 컴포넌트로 props 전달이 불가능해진다.

### 쓰기 경로 — 서버 액션

모든 변경은 `src/lib/admin-actions.ts`의 서버 액션을 거친다. 새 액션을 추가할 때 지킬 패턴:

1. `await requireAdmin()` — 화면 보호(admin layout)만으로는 부족하다
2. 작업 수행
3. `await log(action, entity, id, label, detail)` — AuditLog 필수
4. `refresh()` (= `revalidatePath("/", "layout")`)
5. `return { ok, message }` (`ActionResult`), 예외는 `fail(e)`로 감싸 사람이 읽을 메시지로 변환
   (Prisma unique 위반 → "이미 같은 번호가 존재합니다")

`redirect()`는 예외로 동작하므로 `catch`에서 `NEXT_REDIRECT` digest를 확인해 다시 throw해야 한다
(`saveIndicator` 참고).

폼 쪽은 `src/components/admin/form.tsx`의 `AdminForm`(useActionState + 토스트) /
`SubmitButton`(useFormStatus) / `DeleteButton`(확인창) / `Field` / `SelectField` / `CheckField`를 재사용한다.

### CSV 왕복

`src/lib/csv.ts`의 `CSV_HEADERS`가 내보내기 스키마이고, `admin-actions.ts`의 `importCsv`가 같은 컬럼명을
읽는다. **한쪽만 바꾸면 왕복이 깨진다.** 내보낸 파일을 그대로 다시 올릴 수 있어야 한다.

가져오기는 고유번호(`track_id`/`goal_id`/`target_id`/`indicator_id`/`action_id`) 기준 upsert이고, 탭 구분(TSV)을
자동 감지하며, 행 단위 실패는 전체를 중단하지 않고 몇 행에서 왜 실패했는지 메시지에 담는다.

### 라우팅

- `(public)` 라우트 그룹
  - `/` — 영역 전체를 비교하는 통합 현황
  - `/[track]` — 영역 개요, `/[track]/indicators`·`/actions`·`/data`
  - 공용 헤더·푸터는 그룹 layout, 영역 내 하위 메뉴는 `[track]/layout.tsx`
  - **이행과제가 0건인 영역은 하위 메뉴에서 이행과제 탭이 빠진다** (환경상태·환경체감처럼 관측·조사만 하는 영역)
- `/admin/*` — layout에서 `isAdmin()` 검사 후 미인증이면 `/login`으로 리다이렉트.
- 모든 페이지가 `export const dynamic = "force-dynamic"` (DB 조회가 매 요청마다 필요).
- 딥링크: `/[track]/indicators?goal=<id>` (필터), `?indicator=<id>` (상세 드로어 자동 열림).
- CSV 내보내기는 `?track=<code>`로 영역별 필터가 가능하다 (`exportCsv(type, trackCode)`).

### 인증 — `src/lib/auth.ts`

공용 비밀번호 1개 + HMAC-SHA256 서명 쿠키(httpOnly, 12시간). 계정 개념이 없으므로 추적성은
AuditLog가 담당한다. 비밀번호 비교는 길이까지 감추려고 SHA-256 해시를 `timingSafeEqual`로 비교한다.

**슈퍼관리자는 그 위에 한 겹**이다(`SUPER_ADMIN_PASSWORD`, 쿠키 `ncsd_super`, 30분).
토큰 payload의 `admin`/`super` 역할까지 검사하므로 한쪽 쿠키를 복사해도 다른 쪽이 되지 않고,
`isSuperAdmin()`이 두 쿠키를 모두 요구하므로 관리자 세션 없이는 승격 자체가 불가능하다.
관리자 로그아웃은 슈퍼 쿠키도 함께 지운다. 서버 액션은 `requireSuperAdmin()`으로 막는다.

**여기에 넣을 것은 "사이트 전체가 한 번에 바뀌는" 설정뿐이다.** 지금은 상단 메뉴 노출·순서 하나다.
일상적인 데이터 편집을 여기로 옮기면 30분마다 비밀번호를 다시 묻게 되어 아무도 쓰지 않는다.

### 상단 메뉴 — `src/lib/nav-items.ts` + `/admin/nav`

메뉴 항목 정의는 `NAV_ITEMS`(key·href·label) 한 곳이고, 아이콘만 `top-nav.tsx`가 key로 붙인다.
설정값은 셋 다 세미콜론 구분 — `nav_hidden`(숨길 key) / `nav_order`(전체 key 순서) / `nav_home`(첫 화면 key).

- 새 메뉴를 코드에 추가하면 `nav_order`에 없어도 **뒤에 붙어서 보인다** — 설정을 다시 저장하기 전까지
  조용히 사라지지 않도록 한 것이다.
- 숨김은 헤더에서 빼는 것일 뿐 **라우트는 살아 있다.** 페이지 자체를 막는 기능이 아니다.
- 전부 숨기는 저장은 거부한다. 첫 화면으로 지정한 메뉴를 숨기는 저장도 거부한다.
- 첫 화면이 통합 현황이 아니면 `(public)/page.tsx`가 `redirect()`한다. `homeNavItem()`이
  지정값 → 남아 있는 첫 메뉴 순으로 떨어지므로 첫 화면이 사라지는 상태는 만들어지지 않는다.

## 알아둘 함정

- **Base UI Button**: `<Button render={<Link/>}>`처럼 버튼이 아닌 것을 렌더하면 `nativeButton={false}`가
  필요하다. 진짜 제출 버튼에는 붙이면 안 된다.
- **shadcn/ui v4는 Base UI 기반**(Radix 아님). Select/Tabs/Accordion API가 다르므로, 필터 등은
  네이티브 `<select>`와 직접 만든 컴포넌트를 쓰고 있다. 새 shadcn 컴포넌트를 추가하기 전에
  `src/components/ui/`의 기존 파일에서 실제 prop 시그니처를 확인할 것.
  (Node 18에서 `npx shadcn@latest`는 `File is not defined`로 죽는다 — `node:buffer`의 `File`/`Blob`을
  전역 주입하는 preload를 `NODE_OPTIONS="--require ..."`로 넘기면 우회된다.)
- **App Router `page.tsx`에서 named export 금지** — Next 타입 검증이 거부한다. 공용 컴포넌트는 별도 파일로.
- **Recharts는 지연 로딩**(`src/components/trend-chart-lazy.tsx`). 직접 `trend-chart`를 import하면
  첫 로딩 번들이 100KB 이상 커진다.
- **Base UI 다이얼로그는 포털**이라 서버 HTML에 드로어 내용이 없다. 하이드레이션 직후 열리는 것이 정상.
- **React SSR 텍스트 보간**은 `부문<!-- -->별 현황`처럼 주석이 낀다. HTML 문자열을 검사할 땐 먼저 제거.
- **`prisma db push --force-reset`은 차단되어 있다.** `db:seed`가 스스로 전체 삭제 후 재주입하므로
  그것만으로 충분하다.

## 데이터 주의

`sheets/*.csv`와 시드 DB의 수치는 **형식 예시**이며 실제 공식 통계와 다르다. 대외 공개 전 소관 부서
검수가 필요하다는 경고를 제거하지 말 것 (`footer_note`, README, `sheets/README.md`).

값 없음은 빈 칸으로 둔다 — `0`은 "실제로 0"이라는 뜻이다.


## 라우팅

```
/                        홈 — 히어로 검색 + 통계 스트립 + 17목표 그리드 + 상태 매트릭스
/goals                   17개 목표 (부문별 그룹)
/goals/[no]              목표 상세 — 세부목표 트리 + 지표 마일스톤   ← K-SDGs 탐색의 기본 단위
/indicators              전체 236지표 탐색. ?q= 로 히어로 검색이 도착
/areas/[track]           부문 개요 (+ /indicators, /data, /actions)
/about, /about/sd, /about/ksdgs
/data                    내려받기 · 소관부처 분포 · 방법론
/login, /admin/*, /api/export
```

부문 라우트를 `/areas/` 아래로 둔 이유: `[track]`이 루트의 동적 세그먼트로 있으면
`/goals`·`/about`·`/indicators`를 추가할 때마다 "track_id로 이 이름을 쓰면 안 된다"는 지뢰가 쌓인다.

상단 메뉴는 **Track에서 자동 생성하지 않는다**(엔진 기본 동작과 다른 점). 고정 4항목이고,
`국가지속가능발전목표` 항목에 17개 목표를 부문별 열로 펼치는 메가메뉴가 붙어 있다
(`components/site/top-nav.tsx`). 부문 이름 4개를 메뉴에 나열하면 무엇을 볼 수 있는지 전달되지 않고,
사용자가 실제로 찾는 단위는 "목표 13 기후변화"이기 때문이다.

## 데이터 재생성

```bash
npx tsx scripts/build-sheets.ts   # → sheets/*.csv + scripts/build-sheets.report.md
npm run db:seed
```

원본은 `/home/dyjin/work/SDGs/work/ksdgs_4차/ksdgs.json`(17/119/236, `verify` 필드로 검증됨)이고
잘린 목표 복구를 위해 `2부.txt` 원문도 함께 읽는다. 스크립트가 하는 일:

- 부문 4개·목표 17개는 스크립트 상단 상수(`TRACKS`, `GOAL_COLOR`). **목표 11이 환경이 아니라
  포용사회에 들어간다** — 계획 2부 목차 원문 그대로이고 UN 5P와 다르므로 짐작으로 고치지 말 것.
- `"2018: 16.7%"` 같은 값 문자열을 기준값 / 2030 / 2040으로 분해. 수치가 아니면 `targetLabel`에 원문 보존.
- 원본 파서가 지표표를 지표명 칸에 접어 넣은 63건을 분리하고, 거기서 값을 복구.
- `"2030: 2017년 대비"`처럼 줄바꿈에서 잘린 목표를 `2부.txt`에서 이어 붙여 복구(온실가스 등 5건).
- `direction` 추론(목표값<기준값 → down, 아니면 서술·지표명에서 추론). **여기가 가장 오답이 나기 쉬운 곳**이다.
- 17/119/236이 맞지 않으면 비정상 종료한다.

`scripts/build-sheets.report.md`는 수기 확인이 필요한 항목 목록이다(소관부처 누락 8건,
지표명에서 값을 복구한 건, 통계 미구축 6건 등). 대외 공개 전에 원문과 대조할 것.
