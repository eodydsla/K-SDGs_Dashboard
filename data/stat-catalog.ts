/**
 * 국내 공식 통계 카탈로그 — K-SDGs 지표와 연결하기 위해 직접 정리한 메타데이터.
 *
 * ⚠️ **KOSIS 통계표 코드(orgId/tblId)는 싣지 않는다.** 코드를 지어내면 그럴듯한 거짓이 되고,
 *    확인 없이 인용될 위험이 크다. 대신 통계명·작성기관·제공포털만 적고, 링크는
 *    KOSIS 검색 URL처럼 **조합해도 안전한 주소**만 쓴다.
 *
 * keywords 는 지표명·세부목표명과 대조해 자동 연결하는 데 쓴다.
 * 자동 연결은 전부 `auto=TRUE` 로 표시되어 화면에서 「자동 연결(미검수)」로 보인다.
 */

export interface StatDef {
  code: string;
  name: string;
  org: string;
  portal: "KOSIS" | "e-나라지표" | "기관 누리집" | "국제기구";
  freq: string;
  domain: string;
  /** 주로 연결되는 K-SDGs 목표 번호 */
  goals: number[];
  keywords: string[];
  note?: string;
  url?: string;
}


/** KOSIS 검색 주소 — 통계표 코드를 지어내지 않고도 정확히 도달할 수 있는 경로 */
export const kosisSearch = (q: string) =>
  `https://kosis.kr/search/search.do?query=${encodeURIComponent(q)}`;

/** e-나라지표(국가지표체계) 검색 */
export const indexSearch = (q: string) =>
  `https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?searchWord=${encodeURIComponent(q)}`;

/**
 * 작성기관 누리집.
 * 통계표 깊은 주소는 자주 바뀌고 확인 없이 적으면 죽은 링크가 되므로
 * **기관 대문 주소만** 둔다. 통계 자체는 위의 포털 검색으로 도달한다.
 */
export const ORG_SITE: Record<string, string> = {
  "통계청": "https://kostat.go.kr",
  "행정안전부": "https://www.mois.go.kr",
  "보건복지부": "https://www.mohw.go.kr",
  "질병관리청": "https://www.kdca.go.kr",
  "교육부": "https://www.moe.go.kr",
  "여성가족부": "https://www.mogef.go.kr",
  "환경부": "https://www.me.go.kr",
  "고용노동부": "https://www.moel.go.kr",
  "국토교통부": "https://www.molit.go.kr",
  "산업통상자원부": "https://www.motie.go.kr",
  "해양수산부": "https://www.mof.go.kr",
  "농림축산식품부": "https://www.mafra.go.kr",
  "중소벤처기업부": "https://www.mss.go.kr",
  "과학기술정보통신부": "https://www.msit.go.kr",
  "국무조정실": "https://www.opm.go.kr",
  "기상청": "https://www.kma.go.kr",
  "관세청": "https://www.customs.go.kr",
  "경찰청": "https://www.police.go.kr",
  "산림청": "https://www.forest.go.kr",
  "농촌진흥청": "https://www.rda.go.kr",
  "농촌진흥청 농업유전자원센터": "https://genebank.rda.go.kr",
  "국가유산청": "https://www.khs.go.kr",
  "법원행정처": "https://www.scourt.go.kr",
  "대검찰청": "https://www.spo.go.kr",
  "한국은행": "https://www.bok.or.kr",
  "국립환경과학원": "https://www.nier.go.kr",
  "국립생물자원관": "https://www.nibr.go.kr",
  "국립생태원": "https://www.nie.re.kr",
  "국립공원공단": "https://www.knps.or.kr",
  "국립해양조사원": "https://www.khoa.go.kr",
  "국립수산과학원": "https://www.nifs.go.kr",
  "국립축산과학원": "https://www.nias.go.kr",
  "국립농산물품질관리원": "https://www.naqs.go.kr",
  "한국환경공단": "https://www.keco.or.kr",
  "한국환경연구원(KEI)": "https://www.kei.re.kr",
  "한국환경산업기술원": "https://www.keiti.re.kr",
  "한국에너지공단": "https://www.energy.or.kr",
  "에너지경제연구원": "https://www.keei.re.kr",
  "전력거래소": "https://www.kpx.or.kr",
  "한국수자원공사": "https://www.kwater.or.kr",
  "해양환경공단": "https://www.koem.or.kr",
  "국민연금공단": "https://www.nps.or.kr",
  "국민건강보험공단": "https://www.nhis.or.kr",
  "건강보험심사평가원": "https://www.hira.or.kr",
  "도로교통공단": "https://www.koroad.or.kr",
  "아동권리보장원": "https://www.ncrc.or.kr",
  "대한법률구조공단": "https://www.klac.or.kr",
  "한국행정연구원": "https://www.kipa.re.kr",
  "한국교육개발원": "https://www.kedi.re.kr",
  "한국교육과정평가원": "https://www.kice.re.kr",
  "국가평생교육진흥원": "https://www.nile.or.kr",
  "한국산업인력공단": "https://www.hrdkorea.or.kr",
  "안전보건공단": "https://www.kosha.or.kr",
  "한국농촌경제연구원": "https://www.krei.re.kr",
  "한국문화관광연구원": "https://www.kcti.re.kr",
  "한국지능정보사회진흥원": "https://www.nia.or.kr",
  "한국수출입은행": "https://www.koreaexim.go.kr",
  "한국무역협회": "https://www.kita.net",
  "한국거래소": "https://www.krx.co.kr",
  "온실가스종합정보센터": "https://www.gir.go.kr",
  "KISTEP": "https://www.kistep.re.kr",
  "OECD": "https://www.oecd.org",
  "국제투명성기구": "https://www.transparency.org",
};

/** 여러 기관이 함께 작성한 통계는 맨 앞 기관을 대표로 삼는다 */
export function orgSite(org: string): string | undefined {
  for (const part of org.split(/[·,]/).map((x) => x.trim())) {
    if (ORG_SITE[part]) return ORG_SITE[part];
    // "통계청(국가데이터처)" 처럼 괄호가 붙은 표기
    const bare = part.replace(/\(.*\)$/, "").trim();
    if (ORG_SITE[bare]) return ORG_SITE[bare];
  }
  return undefined;
}

/** 통계 하나가 실제로 열리는 주소. 포털 검색을 1순위로 둔다 — 항상 도달한다. */
export function statUrl(c: StatDef): string {
  if (c.url) return c.url;
  if (c.portal === "e-나라지표") return indexSearch(c.name);
  // 기관 누리집으로 분류했더라도 국가승인통계는 대부분 KOSIS에서 찾을 수 있다
  return kosisSearch(c.name);
}

export const CATALOG: StatDef[] = [
  // ── 인구 ──────────────────────────────────────────────
  { code: "K001", name: "인구총조사", org: "통계청", portal: "KOSIS", freq: "5년", domain: "인구",
    goals: [1, 5, 10, 11], keywords: ["인구", "가구", "세대", "주택", "거주", "인구수"] },
  { code: "K002", name: "장래인구추계", org: "통계청", portal: "KOSIS", freq: "2~3년", domain: "인구",
    goals: [3, 10, 11], keywords: ["장래인구", "인구추계", "고령", "노인", "생산연령", "부양비"] },
  { code: "K003", name: "주민등록인구현황", org: "행정안전부", portal: "KOSIS", freq: "월", domain: "인구",
    goals: [10, 11], keywords: ["주민등록", "인구", "세대수", "지역인구"] },
  { code: "K004", name: "인구동향조사(출생·사망·혼인·이혼)", org: "통계청", portal: "KOSIS", freq: "월·연", domain: "인구",
    goals: [3, 5], keywords: ["출생", "사망", "합계출산율", "혼인", "이혼", "영아사망"] },
  { code: "K005", name: "국내인구이동통계", org: "통계청", portal: "KOSIS", freq: "월·연", domain: "인구",
    goals: [10, 11], keywords: ["인구이동", "전입", "전출", "이동률"] },

  // ── 빈곤 · 소득 · 복지 ────────────────────────────────
  { code: "K010", name: "가계금융복지조사", org: "통계청·한국은행·금융감독원", portal: "KOSIS", freq: "연", domain: "소득·자산",
    goals: [1, 10], keywords: ["상대빈곤율", "빈곤", "소득", "자산", "부채", "지니계수", "5분위배율", "소득분배", "처분가능소득"] },
  { code: "K011", name: "가계동향조사", org: "통계청", portal: "KOSIS", freq: "분기", domain: "소득·소비",
    goals: [1, 10, 12], keywords: ["가계지출", "소비지출", "가계소득", "엥겔"] },
  { code: "K012", name: "국민기초생활보장 수급자 현황", org: "보건복지부", portal: "KOSIS", freq: "연", domain: "복지",
    goals: [1], keywords: ["기초생활", "수급자", "생계급여", "의료급여", "주거급여", "사회안전망"] },
  { code: "K013", name: "사회보장통계", org: "보건복지부", portal: "기관 누리집", freq: "연", domain: "복지",
    goals: [1, 10], keywords: ["사회보장", "사회지출", "공적사회지출", "복지예산", "사각지대"] },
  { code: "K014", name: "국민연금 통계연보", org: "국민연금공단", portal: "기관 누리집", freq: "연", domain: "복지",
    goals: [1, 8], keywords: ["국민연금", "연금", "가입률", "납부", "노후소득"] },
  { code: "K015", name: "고용보험 통계", org: "고용노동부", portal: "기관 누리집", freq: "월·연", domain: "복지",
    goals: [1, 8], keywords: ["고용보험", "실업급여", "가입률", "피보험자"] },
  { code: "K016", name: "장애인 실태조사", org: "보건복지부", portal: "KOSIS", freq: "3년", domain: "복지",
    goals: [1, 4, 8, 10], keywords: ["장애인", "장애", "접근성", "이동권"] },

  // ── 식량 · 농업 ──────────────────────────────────────
  { code: "K020", name: "농림어업총조사", org: "통계청", portal: "KOSIS", freq: "5년", domain: "농림어업",
    goals: [2], keywords: ["농가", "농업", "경지", "어가", "임가", "농림어업"] },
  { code: "K021", name: "농가경제조사", org: "통계청", portal: "KOSIS", freq: "연", domain: "농림어업",
    goals: [2, 8], keywords: ["농가소득", "농업소득", "농가부채", "농업경영"] },
  { code: "K022", name: "식품수급표", org: "한국농촌경제연구원", portal: "기관 누리집", freq: "연", domain: "식량",
    goals: [2], keywords: ["식량자급률", "곡물자급률", "식품수급", "칼로리"] },
  { code: "K023", name: "국민건강영양조사 — 식생활 부문", org: "질병관리청", portal: "KOSIS", freq: "연", domain: "식량",
    goals: [2, 3], keywords: ["영양", "식품안정성", "결식", "식생활", "영양섭취"] },
  { code: "K024", name: "친환경농산물 인증 현황", org: "국립농산물품질관리원", portal: "기관 누리집", freq: "연", domain: "농림어업",
    goals: [2, 12], keywords: ["친환경농업", "유기농", "인증면적", "지속가능농업"] },

  // ── 건강 ─────────────────────────────────────────────
  { code: "K030", name: "사망원인통계", org: "통계청", portal: "KOSIS", freq: "연", domain: "건강",
    goals: [3], keywords: ["사망률", "사망원인", "자살률", "기대수명", "조기사망", "모성사망"] },
  { code: "K031", name: "국민건강영양조사", org: "질병관리청", portal: "KOSIS", freq: "연", domain: "건강",
    goals: [2, 3], keywords: ["비만", "흡연", "음주", "혈압", "당뇨", "고혈압", "건강행태", "유병"] },
  { code: "K032", name: "지역사회건강조사", org: "질병관리청", portal: "기관 누리집", freq: "연", domain: "건강",
    goals: [3, 10], keywords: ["건강격차", "지역건강", "주관적건강", "건강수준"] },
  { code: "K033", name: "국민건강보험통계연보", org: "국민건강보험공단·건강보험심사평가원", portal: "기관 누리집", freq: "연", domain: "건강",
    goals: [3], keywords: ["건강보험", "진료비", "본인부담", "의료이용", "보장률"] },
  { code: "K034", name: "감염병 감시연보", org: "질병관리청", portal: "기관 누리집", freq: "연", domain: "건강",
    goals: [3], keywords: ["감염병", "결핵", "예방접종", "발생률"] },
  { code: "K035", name: "정신건강실태조사", org: "보건복지부", portal: "기관 누리집", freq: "5년", domain: "건강",
    goals: [3], keywords: ["정신건강", "우울", "자살생각", "정신질환"] },
  { code: "K036", name: "온열질환 응급실감시체계", org: "질병관리청", portal: "기관 누리집", freq: "연(하절기)", domain: "건강",
    goals: [3, 13], keywords: ["온열질환", "폭염", "열사병", "기후건강"] },

  // ── 교육 ─────────────────────────────────────────────
  { code: "K040", name: "교육기본통계", org: "교육부·한국교육개발원", portal: "KOSIS", freq: "연", domain: "교육",
    goals: [4], keywords: ["취학률", "진학률", "학생수", "교원", "학급", "고등교육", "유치원", "학교"] },
  { code: "K041", name: "국가수준 학업성취도 평가", org: "교육부·한국교육과정평가원", portal: "기관 누리집", freq: "연", domain: "교육",
    goals: [4], keywords: ["학업성취", "성취수준", "기초학력", "학습성과"] },
  { code: "K042", name: "평생학습개인실태조사", org: "교육부·한국교육개발원", portal: "KOSIS", freq: "연", domain: "교육",
    goals: [4], keywords: ["평생학습", "성인학습", "직업훈련", "참여율"] },
  { code: "K043", name: "국제 학업성취도 평가(PISA)", org: "OECD", portal: "국제기구", freq: "3년", domain: "교육",
    goals: [4], keywords: ["PISA", "국제학업성취", "읽기", "수학", "과학"] },
  { code: "K044", name: "유아교육·보육 통계", org: "교육부·보건복지부", portal: "KOSIS", freq: "연", domain: "교육",
    goals: [4, 5], keywords: ["보육", "어린이집", "영유아", "보육교사", "돌봄"] },

  // ── 성평등 ───────────────────────────────────────────
  { code: "K050", name: "양성평등 실태조사", org: "여성가족부", portal: "기관 누리집", freq: "3년", domain: "성평등",
    goals: [5], keywords: ["성평등", "양성평등", "성역할", "성차별"] },
  { code: "K051", name: "여성경제활동 통계", org: "고용노동부·통계청", portal: "KOSIS", freq: "연", domain: "성평등",
    goals: [5, 8], keywords: ["여성고용", "여성경제활동", "성별임금격차", "경력단절", "여성관리자"] },
  { code: "K052", name: "가정폭력·성폭력 실태조사", org: "여성가족부", portal: "기관 누리집", freq: "3년", domain: "성평등",
    goals: [5, 16], keywords: ["가정폭력", "성폭력", "폭력피해", "여성폭력"] },
  { code: "K053", name: "성별 의사결정 참여 현황", org: "여성가족부", portal: "e-나라지표", freq: "연", domain: "성평등",
    goals: [5, 16], keywords: ["여성의원", "여성관리직", "의사결정", "대표성", "성비"] },

  // ── 물 · 위생 ────────────────────────────────────────
  { code: "K060", name: "상수도 통계", org: "환경부", portal: "기관 누리집", freq: "연", domain: "물",
    goals: [6], keywords: ["상수도", "급수", "보급률", "수돗물", "누수", "유수율"] },
  { code: "K061", name: "하수도 통계", org: "환경부", portal: "기관 누리집", freq: "연", domain: "물",
    goals: [6, 11], keywords: ["하수도", "하수처리", "분뇨", "하수관로"] },
  { code: "K062", name: "물환경측정망 운영결과(수질측정망)", org: "국립환경과학원", portal: "기관 누리집", freq: "월·연", domain: "물",
    goals: [6, 14], keywords: ["수질", "BOD", "COD", "총인", "하천", "호소", "좋은물"] },
  { code: "K063", name: "지하수 조사연보", org: "환경부·한국수자원공사", portal: "기관 누리집", freq: "연", domain: "물",
    goals: [6], keywords: ["지하수", "관정", "지하수위", "함양"] },
  { code: "K064", name: "수자원 이용현황(水利)", org: "환경부·한국수자원공사", portal: "기관 누리집", freq: "연", domain: "물",
    goals: [6], keywords: ["물이용", "용수", "물수급", "가뭄", "저수율", "수자원"] },

  // ── 에너지 ───────────────────────────────────────────
  { code: "K070", name: "에너지통계연보", org: "에너지경제연구원", portal: "기관 누리집", freq: "연", domain: "에너지",
    goals: [7, 12], keywords: ["에너지", "1차에너지", "최종에너지", "에너지소비", "에너지원단위"] },
  { code: "K071", name: "신재생에너지 보급통계", org: "한국에너지공단", portal: "기관 누리집", freq: "연", domain: "에너지",
    goals: [7, 13], keywords: ["신재생", "재생에너지", "태양광", "풍력", "보급률", "발전비중"] },
  { code: "K072", name: "전력통계정보시스템(EPSIS)", org: "전력거래소", portal: "기관 누리집", freq: "월·연", domain: "에너지",
    goals: [7, 9, 13], keywords: ["전력", "발전량", "발전설비", "전력수요", "발전믹스", "전기", "전력소비", "송전", "배전", "예비율", "설비용량"],
    url: "https://epsis.kpx.or.kr",
    note: "발전량·설비·수요·연료원별 발전믹스까지 전력 관련 통계가 가장 촘촘하다. 에너지·기후 지표의 1차 출처." },
  { code: "K073", name: "에너지총조사", org: "산업통상자원부·에너지경제연구원", portal: "기관 누리집", freq: "3년", domain: "에너지",
    goals: [7, 12], keywords: ["에너지이용", "에너지효율", "부문별에너지"] },
  { code: "K074", name: "에너지바우처·에너지복지 현황", org: "산업통상자원부·한국에너지공단", portal: "기관 누리집", freq: "연", domain: "에너지",
    goals: [1, 7], keywords: ["에너지복지", "에너지빈곤", "바우처", "냉난방"] },

  // ── 일자리 · 경제 ────────────────────────────────────
  { code: "K080", name: "경제활동인구조사", org: "통계청", portal: "KOSIS", freq: "월·연", domain: "고용",
    goals: [5, 8, 10], keywords: ["고용률", "실업률", "취업자", "경제활동참가", "비정규직", "임금근로"] },
  { code: "K081", name: "지역별고용조사", org: "통계청", portal: "KOSIS", freq: "반기", domain: "고용",
    goals: [8, 10], keywords: ["지역고용", "시군구", "취업", "일자리"] },
  { code: "K082", name: "고용형태별근로실태조사", org: "고용노동부", portal: "KOSIS", freq: "연", domain: "고용",
    goals: [5, 8, 10], keywords: ["임금", "근로시간", "임금격차", "고용형태", "시간당임금"] },
  { code: "K083", name: "국민계정", org: "한국은행", portal: "기관 누리집", freq: "분기·연", domain: "경제",
    goals: [8, 9, 12], keywords: ["GDP", "국내총생산", "경제성장률", "1인당", "부가가치", "국민소득"] },
  { code: "K084", name: "산업재해현황분석", org: "고용노동부·안전보건공단", portal: "기관 누리집", freq: "연", domain: "고용",
    goals: [8], keywords: ["산업재해", "재해율", "사고사망", "산재", "안전보건"] },
  { code: "K085", name: "청년 고용동향", org: "통계청·고용노동부", portal: "e-나라지표", freq: "월·연", domain: "고용",
    goals: [4, 8], keywords: ["청년고용", "청년실업", "니트", "청년"] },

  // ── 산업 · 혁신 · 인프라 ─────────────────────────────
  { code: "K090", name: "연구개발활동조사", org: "과학기술정보통신부·KISTEP", portal: "KOSIS", freq: "연", domain: "과학기술",
    goals: [9], keywords: ["연구개발", "R&D", "연구원", "특허", "혁신", "GDP대비"] },
  { code: "K091", name: "광업·제조업조사", org: "통계청", portal: "KOSIS", freq: "연", domain: "산업",
    goals: [9], keywords: ["제조업", "사업체", "출하액", "부가가치", "종사자"] },
  { code: "K092", name: "인터넷이용실태조사", org: "과학기술정보통신부·한국지능정보사회진흥원", portal: "KOSIS", freq: "연", domain: "정보통신",
    goals: [9, 10, 17], keywords: ["인터넷", "정보화", "디지털", "이용률", "정보격차", "ICT"] },
  { code: "K093", name: "국토교통 통계연보", org: "국토교통부", portal: "기관 누리집", freq: "연", domain: "국토교통",
    goals: [9, 11], keywords: ["도로", "철도", "교통", "사회기반시설", "SOC", "물류"] },
  { code: "K094", name: "중소기업 실태조사", org: "중소벤처기업부", portal: "KOSIS", freq: "연", domain: "산업",
    goals: [8, 9], keywords: ["중소기업", "소상공인", "창업", "기업규모"] },

  // ── 불평등 ───────────────────────────────────────────
  { code: "K100", name: "소득분배지표", org: "통계청", portal: "e-나라지표", freq: "연", domain: "소득분배",
    goals: [10], keywords: ["지니계수", "소득5분위배율", "상대적빈곤율", "소득분배", "불평등"] },
  { code: "K101", name: "이민자 체류실태 및 고용조사", org: "통계청·법무부", portal: "KOSIS", freq: "연", domain: "이주",
    goals: [10], keywords: ["이주민", "외국인", "체류", "다문화", "이민"] },
  { code: "K102", name: "국민 다문화수용성 조사", org: "여성가족부", portal: "기관 누리집", freq: "3년", domain: "이주",
    goals: [10, 16], keywords: ["다문화수용성", "차별", "포용", "인식"] },
  { code: "K103", name: "사회통합실태조사", org: "한국행정연구원", portal: "기관 누리집", freq: "연", domain: "사회",
    goals: [10, 16], keywords: ["신뢰", "사회통합", "정치효능감", "기관신뢰", "차별경험"] },

  // ── 도시 · 주거 ──────────────────────────────────────
  { code: "K110", name: "주거실태조사", org: "국토교통부", portal: "기관 누리집", freq: "연", domain: "주거",
    goals: [11], keywords: ["주거", "최저주거기준", "자가점유", "주거비", "PIR", "주거복지"] },
  { code: "K111", name: "주택총조사·주택보급률", org: "통계청·국토교통부", portal: "KOSIS", freq: "연", domain: "주거",
    goals: [11], keywords: ["주택", "주택보급률", "노후주택", "공공임대"] },
  { code: "K112", name: "도시계획현황", org: "국토교통부", portal: "기관 누리집", freq: "연", domain: "도시",
    goals: [11, 15], keywords: ["도시계획", "용도지역", "시가화", "공원", "녹지", "도시면적"] },
  { code: "K113", name: "대중교통 현황조사", org: "국토교통부", portal: "기관 누리집", freq: "연", domain: "교통",
    goals: [11], keywords: ["대중교통", "수단분담률", "버스", "지하철", "저상버스", "자전거"] },
  { code: "K114", name: "교통사고 통계", org: "도로교통공단·경찰청", portal: "KOSIS", freq: "연", domain: "교통",
    goals: [3, 11], keywords: ["교통사고", "사고사망", "보행자", "교통안전"] },
  { code: "K115", name: "문화유산 통계", org: "국가유산청", portal: "기관 누리집", freq: "연", domain: "문화",
    goals: [11], keywords: ["문화유산", "세계유산", "등재", "보존", "문화재"] },

  // ── 생산 · 소비 · 폐기물 ─────────────────────────────
  { code: "K120", name: "전국 폐기물 발생 및 처리현황", org: "환경부·한국환경공단", portal: "기관 누리집", freq: "연", domain: "자원순환",
    goals: [11, 12], keywords: ["폐기물", "생활폐기물", "사업장폐기물", "건설폐기물", "재활용", "매립", "소각"] },
  { code: "K121", name: "자원순환 통계(순환이용률)", org: "환경부", portal: "기관 누리집", freq: "연", domain: "자원순환",
    goals: [12], keywords: ["순환이용", "자원순환", "재활용률", "자원생산성", "물질흐름"] },
  { code: "K122", name: "녹색제품 구매실적", org: "환경부·한국환경산업기술원", portal: "기관 누리집", freq: "연", domain: "지속가능소비",
    goals: [12], keywords: ["녹색제품", "녹색구매", "친환경인증", "환경표지"] },
  { code: "K123", name: "화학물질 배출·이동량(PRTR)", org: "환경부·국립환경과학원", portal: "기관 누리집", freq: "연", domain: "화학물질",
    goals: [3, 12], keywords: ["화학물질", "유해물질", "배출량", "유해성"] },
  { code: "K124", name: "지속가능경영보고서 발간 현황", org: "한국거래소·산업통상자원부", portal: "기관 누리집", freq: "연", domain: "지속가능경영",
    goals: [12], keywords: ["지속가능경영", "ESG", "보고서 발간", "기업공시"] },
  { code: "K125", name: "국민여행조사", org: "문화체육관광부·한국문화관광연구원", portal: "KOSIS", freq: "연", domain: "관광",
    goals: [8, 12], keywords: ["관광", "여행", "생태관광", "방문자"] },

  // ── 기후 ─────────────────────────────────────────────
  { code: "K130", name: "국가 온실가스 인벤토리", org: "환경부·온실가스종합정보센터", portal: "기관 누리집", freq: "연", domain: "기후",
    goals: [7, 13], keywords: ["온실가스", "배출량", "탄소", "감축", "인벤토리", "CO2", "탄소중립"] },
  { code: "K131", name: "기후변화 감시·예측 정보", org: "기상청", portal: "기관 누리집", freq: "연", domain: "기후",
    goals: [13], keywords: ["기온", "강수", "폭염일수", "열대야", "기후변화", "이상기후"] },
  { code: "K132", name: "재해연보·재난연감", org: "행정안전부", portal: "기관 누리집", freq: "연", domain: "방재",
    goals: [1, 11, 13], keywords: ["자연재해", "피해액", "이재민", "침수", "재난", "방재"] },
  { code: "K133", name: "지자체 기후변화 적응대책 이행현황", org: "환경부·한국환경연구원", portal: "기관 누리집", freq: "연", domain: "기후",
    goals: [13], keywords: ["적응대책", "기후적응", "지자체", "이행점검"] },
  { code: "K134", name: "배출권거래제 운영결과", org: "환경부", portal: "기관 누리집", freq: "연", domain: "기후",
    goals: [13], keywords: ["배출권", "할당", "거래제", "감축의무"] },

  // ── 대기 ─────────────────────────────────────────────
  { code: "K140", name: "대기환경연보", org: "국립환경과학원", portal: "기관 누리집", freq: "연", domain: "대기",
    goals: [3, 11], keywords: ["미세먼지", "초미세먼지", "PM10", "PM2.5", "오존", "이산화질소", "대기질", "대기오염"] },
  { code: "K141", name: "대기오염물질 배출량(CAPSS)", org: "국립환경과학원", portal: "기관 누리집", freq: "연", domain: "대기",
    goals: [3, 11, 12], keywords: ["대기배출", "질소산화물", "황산화물", "휘발성유기화합물", "배출원"] },

  // ── 해양 ─────────────────────────────────────────────
  { code: "K150", name: "해양환경측정망 운영결과", org: "해양수산부·해양환경공단", portal: "기관 누리집", freq: "연", domain: "해양",
    goals: [14], keywords: ["해양수질", "해양환경", "연안", "적조", "해양오염"] },
  { code: "K151", name: "해양수산 통계연보", org: "해양수산부", portal: "기관 누리집", freq: "연", domain: "해양",
    goals: [14], keywords: ["수산", "어업", "어획량", "양식", "어선", "수산자원"] },
  { code: "K152", name: "해양쓰레기 수거·처리 현황", org: "해양수산부·해양환경공단", portal: "기관 누리집", freq: "연", domain: "해양",
    goals: [12, 14], keywords: ["해양쓰레기", "해양폐기물", "수거", "부유쓰레기"] },
  { code: "K153", name: "해양보호구역 지정 현황", org: "해양수산부", portal: "기관 누리집", freq: "연", domain: "해양",
    goals: [14], keywords: ["해양보호구역", "습지보호", "보전", "갯벌"] },
  { code: "K154", name: "해수면 상승·해수온 관측", org: "국립해양조사원", portal: "기관 누리집", freq: "연", domain: "해양",
    goals: [13, 14], keywords: ["해수면", "해수온", "조위", "연안침식"] },

  // ── 육상생태계 ───────────────────────────────────────
  { code: "K160", name: "산림기본통계", org: "산림청", portal: "KOSIS", freq: "5년", domain: "산림",
    goals: [15], keywords: ["산림", "임야", "산림면적", "임목축적", "조림"] },
  { code: "K161", name: "국가생물종목록·생물다양성 통계", org: "국립생물자원관", portal: "기관 누리집", freq: "연", domain: "생물다양성",
    goals: [14, 15], keywords: ["생물다양성", "생물종", "멸종위기", "고유종", "복원"] },
  { code: "K162", name: "자연환경조사", org: "국립생태원·환경부", portal: "기관 누리집", freq: "주기적", domain: "생태",
    goals: [15], keywords: ["자연환경", "생태우수", "서식지", "훼손지", "생태축"] },
  { code: "K163", name: "보호지역 지정 현황", org: "환경부·국립공원공단", portal: "기관 누리집", freq: "연", domain: "생태",
    goals: [14, 15], keywords: ["보호지역", "국립공원", "생태경관보전지역", "습지보호지역"] },
  { code: "K164", name: "토지피복지도", org: "환경부", portal: "기관 누리집", freq: "주기적", domain: "국토",
    goals: [11, 15], keywords: ["토지피복", "토지이용", "불투수", "녹지면적"] },
  { code: "K165", name: "야생동물 밀렵·밀거래 단속실적", org: "환경부", portal: "기관 누리집", freq: "연", domain: "생태",
    goals: [15], keywords: ["야생동물", "밀렵", "밀거래", "단속"] },

  // ── 평화 · 제도 ──────────────────────────────────────
  { code: "K170", name: "범죄분석·경찰통계연보", org: "경찰청·대검찰청", portal: "KOSIS", freq: "연", domain: "치안",
    goals: [16], keywords: ["범죄", "검거", "발생", "치안", "피해"] },
  { code: "K171", name: "아동학대 주요통계", org: "보건복지부·아동권리보장원", portal: "기관 누리집", freq: "연", domain: "아동",
    goals: [5, 16], keywords: ["아동학대", "학대", "피해아동", "발견율"] },
  { code: "K172", name: "정보공개 연차보고서", org: "행정안전부", portal: "기관 누리집", freq: "연", domain: "행정",
    goals: [16], keywords: ["정보공개", "청구", "공개율", "투명성"] },
  { code: "K173", name: "부패인식지수(CPI)", org: "국제투명성기구", portal: "국제기구", freq: "연", domain: "행정",
    goals: [16], keywords: ["부패", "청렴", "투명성", "부패인식"] },
  { code: "K174", name: "법률구조 통계", org: "대한법률구조공단", portal: "기관 누리집", freq: "연", domain: "사법",
    goals: [16], keywords: ["법률구조", "사법접근", "구조건수"] },
  { code: "K175", name: "출생신고·가족관계등록 통계", org: "법원행정처", portal: "기관 누리집", freq: "연", domain: "행정",
    goals: [16], keywords: ["출생등록", "출생신고", "가족관계등록"] },

  // ── 국제협력 ─────────────────────────────────────────
  { code: "K180", name: "대한민국 ODA 통계", org: "국무조정실·한국수출입은행", portal: "기관 누리집", freq: "연", domain: "국제협력",
    goals: [17], keywords: ["ODA", "공적개발원조", "개발협력", "GNI대비", "무상원조", "유상원조"] },
  { code: "K181", name: "OECD DAC 개발협력 통계", org: "OECD", portal: "국제기구", freq: "연", domain: "국제협력",
    goals: [17], keywords: ["DAC", "국제비교", "원조", "개발재원"] },
  { code: "K182", name: "무역통계", org: "관세청·한국무역협회", portal: "기관 누리집", freq: "월·연", domain: "무역",
    goals: [8, 17], keywords: ["수출", "수입", "교역", "무역", "개발도상국"] },
  { code: "K183", name: "국제투자대조표·해외직접투자 통계", org: "한국은행·한국수출입은행", portal: "기관 누리집", freq: "분기·연", domain: "투자",
    goals: [17], keywords: ["해외직접투자", "투자규모", "FDI"] },

  // ── 보강분: 자동연결에서 빈 지표를 메우기 위해 추가 조사한 통계 ──
  { code: "K190", name: "환경교육 추진현황", org: "환경부·환경보전협회", portal: "기관 누리집", freq: "연", domain: "환경교육",
    goals: [4, 12, 13], keywords: ["환경교육", "환경교육 수혜", "환경학습", "교육 수혜자"] },
  { code: "K191", name: "국민환경의식조사", org: "한국환경연구원(KEI)", portal: "기관 누리집", freq: "연", domain: "환경의식",
    goals: [12, 13], keywords: ["환경의식", "환경인식", "국민의식", "환경태도"] },
  { code: "K192", name: "농업환경변동조사(토양 이화학성)", org: "농촌진흥청", portal: "기관 누리집", freq: "4년", domain: "농업환경",
    goals: [2, 15], keywords: ["토양", "밭토양", "논토양", "산도", "pH", "유기물", "토양환경"] },
  { code: "K193", name: "국가농업유전자원 관리 현황", org: "농촌진흥청 농업유전자원센터", portal: "기관 누리집", freq: "연", domain: "유전자원",
    goals: [2, 15], keywords: ["식물유전자원", "유전자원", "종자", "보존시설", "자원 점수"] },
  { code: "K194", name: "가축유전자원 관리 현황", org: "국립축산과학원", portal: "기관 누리집", freq: "연", domain: "유전자원",
    goals: [2, 15], keywords: ["동물유전자원", "가축유전자원", "축산자원", "정액", "수정란"] },
  { code: "K195", name: "정부양곡 수급 및 비축 현황", org: "농림축산식품부", portal: "기관 누리집", freq: "연", domain: "식량",
    goals: [2], keywords: ["비축미", "정부비축", "양곡", "재고량", "식량비축", "공공비축"] },
  { code: "K196", name: "보건의료실태조사(병상·인력 자원)", org: "보건복지부", portal: "기관 누리집", freq: "3년", domain: "보건의료",
    goals: [3], keywords: ["병상", "공공병상", "의료기관", "의료인력", "의사수", "간호사"] },
  { code: "K197", name: "국제 성인역량조사(PIAAC)", org: "OECD·교육부", portal: "국제기구", freq: "약 10년", domain: "교육",
    goals: [4], keywords: ["PIAAC", "성인역량", "언어역량", "수리역량", "숙련도", "문해"] },
  { code: "K198", name: "성인문해능력조사", org: "교육부·국가평생교육진흥원", portal: "기관 누리집", freq: "3년", domain: "교육",
    goals: [4], keywords: ["문해율", "문해", "성인문해", "비문해"] },
  { code: "K199", name: "직업능력개발 통계", org: "고용노동부·한국산업인력공단", portal: "기관 누리집", freq: "연", domain: "직업훈련",
    goals: [4, 8], keywords: ["직업훈련", "직업교육", "능력개발", "훈련참여", "재직자훈련"] },
  { code: "K200", name: "외래생물 관리 현황", org: "환경부·국립생태원", portal: "기관 누리집", freq: "연", domain: "생태",
    goals: [15], keywords: ["외래생물", "생태계교란", "관리대상종", "침입종"] },
  { code: "K201", name: "어가경제조사", org: "통계청", portal: "KOSIS", freq: "연", domain: "농림어업",
    goals: [2, 14], keywords: ["어가소득", "어가경제", "어업소득", "어가"] },
  { code: "K202", name: "지속가능발전 이행보고·국가위원회 운영현황", org: "국무조정실·국가지속가능발전위원회", portal: "기관 누리집", freq: "연", domain: "제도",
    goals: [16, 17], keywords: ["지속가능발전", "이행점검", "국가위원회", "민관협의체", "정책일관성", "PCSD", "기본계획 수립", "이행보고"] },
  { code: "K203", name: "해양산성화·해양생태 관측", org: "국립수산과학원·국립해양조사원", portal: "기관 누리집", freq: "연", domain: "해양",
    goals: [14], keywords: ["해양산성화", "pH", "외해", "해양관측", "산도"] },
  { code: "K204", name: "학교 상담·복지인력 배치 현황", org: "교육부", portal: "기관 누리집", freq: "연", domain: "교육",
    goals: [3, 4], keywords: ["전문상담교사", "상담교사", "배치율", "학교상담", "학교복지"] },
];
