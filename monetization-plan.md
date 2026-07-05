# mcp-finance-tools 수익화 전략

작성일: 2026-07-04
트랙: **mcp-finance-tools (신규 독립 트랙)** — Rise Mentality/seeyouatthetop, money.radar와 완전히 분리된 자산. 사용자 지시로 기존 디지털 상품 카탈로그 확장 트랙은 배제하고 이 트랙에 집중.

---

## 1. 배경 — 왜 MCP 서버인가

2026년 현재 MCP(Model Context Protocol) 마켓플레이스 생태계가 실제 수익 구조로 자리잡았다:

- **MCPize**: 개발자에게 수익의 85%를 지급하는 배분 모델.
- **Apify**: 사용량 기반(pay-per-use) 과금을 MCP 서버에도 적용.
- **21st.dev**: 프리미엄(freemium) 모델 — 기본 기능 무료, 고급 기능 유료 구독.

Claude, Cursor 등 AI 에이전트가 MCP 서버의 tool을 호출할 때마다 실행 횟수/구독에 따라 개발자에게 수익이 흐르는 구조다. 다만 현재 17,000개 이상 등록된 MCP 서버 중 5% 미만만 실제 수익을 내고 있다 — 대부분 범용 유틸리티(파일시스템, 브라우저 자동화 등)로 포화 상태다.

**차별화 지점**: 한국 세법·근로기준법·부동산 세제처럼 영어권 서버가 다루지 않는 "한국형 도메인 특화". 국내 개발자가 AI 에이전트로 급여/세무/대출 관련 기능을 붙이려 할 때 이 서버가 사실상 유일한 선택지가 되는 니치를 노린다.

---

## 2. 타겟 고객

1. **한국 개발자 / AI 에이전트 빌더** — Claude/Cursor로 사내 도구나 챗봇을 만들면서 "연봉 계산", "대출 한도 계산" 같은 기능이 필요한 개인/소규모 팀.
2. **핀테크 스타트업** — 급여관리 SaaS, 대출 비교 서비스, 가계부 앱 등에서 계산 로직을 자체 구현하는 대신 MCP로 붙이고 싶은 팀 (본인이 핀테크 전공 3학년 + 스타트업 준비 중이라는 배경과도 맞닿는 포지셔닝).
3. **부동산/세무 관련 서비스 개발자** — 양도소득세, DSR/DTI 등 복잡한 계산을 프론트엔드에 붙여야 하는 프롭테크(proptech) 서비스.

---

## 3. 배포 채널

| 채널 | 역할 |
|---|---|
| **Smithery** (smithery.ai) | MCP 서버 디스커버리 1순위 마켓플레이스. 등록 시 자동 설치 스크립트 생성. |
| **Glama** (glama.ai/mcp/servers) | MCP 서버 품질 랭킹/리뷰 노출. 카테고리(Finance/Korea) 태그로 검색 상위 노출 노림. |
| **MCP.so** | 커뮤니티 큐레이션 디렉토리. GitHub 스타 수와 README 품질이 노출 순위에 영향. |
| **GitHub (README SEO)** | "korea", "korean-tax", "4대보험", "MCP server" 등 키워드를 README/토픽에 명시해 GitHub 검색 유입 확보. |
| **국내 개발자 커뮤니티** | 스레드(Threads), velog, 디스콰이엇(disquiet), OKKY, GeekNews 등에 "한국 세법 특화 MCP 서버 만들었습니다" 형태로 공유. |

---

## 4. 가격 구조

- **무료 3종**: `calc_4major_insurance`(4대보험), `calc_annual_salary_net`(연봉실수령액), `calc_severance_pay`(퇴직금) — 설치 장벽을 낮추고 입소문/GitHub 스타를 모으는 미끼 상품.
- **프리미엄 3종**: `calc_capital_gains_tax_simple`(양도소득세 간이), `calc_dsr_dti`(DSR/DTI), `calc_fx_convert`(환율변환) — 부동산/대출처럼 "고관여·고가치" 계산에 유료 게이트.
- **가격**: Gumroad 구독형 라이선스 키, **월 9,900원**.
  - 무료 사용자가 실제로 필요를 느끼는 시점(부동산 매매, 대출 갈아타기)에 프리미엄 3종이 필요해지도록 기능을 나눔.
  - 추후 사용량 기반 과금(Apify 방식)이나 팀 단위 라이선스(예: 스타트업 5인 이하 월 29,000원)로 확장 가능.

---

## 5. 성장 전략

1. **무료 도구로 설치 저변 확보** → GitHub README에 "설치 30초, 무료 3종 즉시 사용 가능" 강조.
2. **"한국 세법 특화 MCP 서버" 포지셔닝** — 범용 계산기가 아니라 "AI 에이전트가 한국 급여/세무를 이해하게 만드는 유일한 MCP 서버"로 카피 작성.
3. **개발자 커뮤니티 홍보** — 스레드/GitHub/OKKY/디스콰이엇에 데모 GIF(Claude Desktop에서 "제 연봉 4000만원인데 실수령액 얼마예요?" 질문 → tool 호출 → 답변)와 함께 공유.
4. **콘텐츠 마케팅** — "MCP로 AI 에이전트에 한국 세무 기능 붙이는 법" 같은 개발 블로그 포스트로 SEO 유입.
5. **버전 확장 로드맵**: 사용자 피드백을 받아 무료/프리미엄 도구를 추가 (예: 종합소득세 간이계산, 전세보증금 반환보증 계산기 등) — 카탈로그가 커질수록 마켓플레이스 랭킹과 재방문율 상승.

---

## 6. 사용자가 직접 해야 할 일 (이 세션 도구로는 불가능한 영역)

이 세션에는 실제 결제 API, 마켓플레이스 계정 로그인/제출 폼 작성, 브라우저 자동화가 없다. 아래는 사용자가 직접 진행해야 한다:

1. **Smithery 계정 가입 및 실제 배포** — smithery.ai에 가입, 이 저장소를 연결해 `npx mcp-finance-tools`가 마켓플레이스에서 검색되도록 등록.
2. **Glama 등록** — glama.ai/mcp/servers에 GitHub 저장소 URL 제출, 카테고리 태그(Finance, Korea) 설정.
3. **MCP.so 등록** — 커뮤니티 디렉토리 제출 폼 작성.
4. **GitHub 공개 저장소 생성 및 push** — 현재 로컬(`C:\Users\eady2\OneDrive\Desktop\revenue-system\mcp-finance-tools\`)에만 존재. `git init` → GitHub 원격 저장소 생성 → push 필요.
5. **npm 배포** (`npm publish`) — `npx -y mcp-finance-tools`가 실제로 동작하려면 npm 레지스트리에 패키지를 공개 배포해야 함 (현재는 로컬 파일로만 존재).
6. **Gumroad 라이선스 판매 페이지 개설** — 월 9,900원 구독 상품 리스팅 생성. 결제 완료 시 라이선스 키(`KRFIN-XXXX-XXXX-XXXX` 형식 또는 실제 발급 시스템)를 자동 발송하는 구조 설정 (Gumroad의 "라이선스 키 자동 생성" 기능 또는 Zapier 연동 검토).
7. ~~실제 라이선스 검증 백엔드 구축~~ → **2026-07-05(3회차)에서 완료.** `calculators.js`의 `requirePremiumLicense()`가 이제 Gumroad License Verification API(`https://api.gumroad.com/v2/licenses/verify`)를 실시간으로 호출해 검증한다(§8-4 참고). 사용자가 직접 해야 할 일은 **Gumroad 상품을 실제로 개설하고 `GUMROAD_PRODUCT_PERMALINK` 환경변수를 그 permalink로 설정하는 것**뿐이며, 별도 백엔드 서버·웹훅·DB 구축은 더 이상 필요하지 않다(Gumroad가 검증 서버 역할을 대신함).

---

## 7. 다음 실행 때 할 일 (roadmap) — 1회차 기준 (아래 §9 "2회차 갱신"이 최신)

1. ~~npm 공개 배포 준비 (package.json `name` 중복 확인, `npm publish --access public`).~~ → 2회차에서 이름 중복 없음 확인 완료(실제 publish는 사용자 몫).
2. GitHub 저장소 생성 + README에 뱃지(라이선스, npm 버전) 추가.
3. ~~Smithery/Glama 등록에 필요한 `smithery.yaml` 또는 등록 메타데이터 작성 지원.~~ → 2회차에서 `marketplace-metadata.md` 작성 완료.
4. ~~무료 도구 사용 데이터를 기반으로 프리미엄 4~6번째 도구 후보 기획 (예: 종합소득세 간이계산기).~~ → 2회차에서 **청약 가점 계산기**(`calc_housing_subscription_score`)를 4번째 프리미엄 도구로 구현 완료.
5. Gumroad 라이선스 키 발급 자동화 스펙 설계 (웹훅 수신 → 키 생성 → 이메일 발송) → 아래 §8에서 상세 설계.

---

## 8. 라이선스 발급 자동화 설계 (2026-07-04, 2회차)

**전제**: 이 세션 툴로는 실제 결제 백엔드(웹훅 수신 서버, 이메일 발송 서비스)를 구축·배포할 수 없다. 아래는 "실제로 구현/시뮬레이션한 부분"과 "설계만 하고 사용자가 직접 구축해야 하는 부분"을 명확히 구분한 문서다.

### 8-1. 실제로 구현한 부분 (코드로 시뮬레이션 가능한 영역)

`calculators.js`에 다음을 구현하고 `test-calculators.js`에서 검증했다.

- **`generateLicenseKey()`** — `crypto.randomBytes` 기반 암호학적 난수로 `KRFIN-XXXX-YYYY-ZZZZ` 형식의 키를 생성한다. 앞 두 세그먼트(XXXX, YYYY)는 순수 난수, 마지막 세그먼트(ZZZZ)는 `HMAC-SHA256(secret, "XXXX-YYYY")`에서 유도한 체크섬이다.
- **`isValidLicenseKey(key)` 강화** — 기존에는 정규식 형식만 맞으면(`KRFIN-AB12-CD34-EF56` 같은 임의 문자열도) 통과했으나, 이제는 체크섬을 재계산해 일치해야만 통과한다. `test-calculators.js` §4-1b에서 "임의로 만든 키는 거부됨", "발급된 키를 한 글자만 변조해도 거부됨"을 확인했다.
- **혼동 문자 제외**: 0/O, 1/I를 알파벳에서 제외해 사람이 직접 옮겨 적을 때 오타 가능성을 낮췄다(전화/이메일 안내 시 유용).

이 방식의 장점: 발급 서버 없이도 "아무 문자열이나 프리미엄 도구를 쓸 수 있는" 취약점을 막는다. 한계: `LICENSE_SECRET`이 npm 패키지에 그대로 배포되므로, 패키지 소스를 분석하면 이론상 스스로 유효한 키를 만들어낼 수 있다(모든 오프라인 라이선스 검증의 공통적 한계). 아래 §8-3에서 프로덕션 전환 시 보완 방안을 제시한다.

### 8-2. 결제 → 키 발급 → 이메일 전달 흐름 설계 (문서만 — 실제 구축은 사용자 몫)

**Option A: Gumroad 네이티브 라이선스 키 기능 (권장 — 별도 백엔드 불필요)**

Gumroad는 상품 설정에서 "Generate a unique license key per sale"를 켜면 결제 완료 시 자동으로 라이선스 키를 생성해 구매자 영수증 이메일에 포함시켜준다. 흐름:

1. Gumroad 상품(월 9,900원 구독)에서 라이선스 키 자동 생성 옵션 활성화.
2. 구매자가 결제 → Gumroad가 자동으로 키 생성 + 영수증 이메일 발송 (코드 작성 불필요).
3. MCP 서버 쪽 검증은 Gumroad License Verification API(`POST https://api.gumroad.com/v2/licenses/verify`, `product_id` + `license_key` 파라미터)를 호출해 유효성·환불 여부를 실시간 확인.
4. 다만 이 방식은 매 tool 호출마다(또는 세션 시작 시 1회) 외부 네트워크 호출이 필요해, 완전 오프라인 stdio 서버 철학과 다소 배치된다 — 세션 시작 시 1회만 검증하고 결과를 캐싱하는 방식을 권장.

**Option B: 자체 라이선스 서버 + 커스텀 키 (Gumroad 외 채널도 지원하고 싶을 때)**

1. Gumroad(또는 다른 결제 수단)의 **웹훅**("Ping" 기능, 판매 발생 시 지정 URL로 POST) 수신.
2. 경량 서버리스 함수(Vercel/Cloudflare Workers/Netlify Functions 중 택1, 이 세션 툴로는 배포 불가 — 사용자가 별도로 구축)가 웹훅을 받아:
   a. `generateLicenseKey()`와 동일한 로직(HMAC 체크섬)으로 키 생성.
   b. `{email, license_key, purchase_id, plan, created_at, status: "active"}`를 DB(Supabase/Firebase/Google Sheets 등 경량 스토리지)에 저장 — 이 DB가 있어야 향후 환불 시 키를 "revoked" 처리할 수 있음(현재 오프라인 체크섬 방식의 가장 큰 약점 보완).
   c. 이메일 발송(SendGrid/Resend API 등)으로 구매자에게 키 전달.
3. MCP 서버는 `KR_FINANCE_LICENSE_KEY` 환경변수를 그대로 오프라인 체크섬 검증(현재 구현)하거나, 더 견고하게 하려면 세션 시작 시 1회 서버 API로 "이 키가 revoked 상태인지"만 조회(체크섬은 로컬에서, revocation 여부만 원격에서 — 네트워크 의존을 최소화하는 하이브리드 방식).

**권장 순서**: 처음에는 Option A(Gumroad 네이티브 기능)로 빠르게 시작 → 구독자가 늘고 환불/악용 사례가 생기면 Option B로 이전.

### 8-3. 오프라인 체크섬 검증의 한계와 향후 보완 [2026-07-05 폐기됨 — §8-4 참고]

~~현재 `LICENSE_SECRET`은 환경변수로 오버라이드 가능하지만 기본값이 소스에 하드코딩돼 있다...~~

**이 방식 자체가 폐기되었다.** 배포 직후 사용자가 "이거 팔 수 있는 품질이 완성된 거냐"고 물어 코드를 리뷰한 결과, 이 오프라인 HMAC 체크섬 방식은 소스코드(`generateLicenseKey()` + `LICENSE_SECRET`)가 npm/GitHub에 그대로 공개되어 있어 **누구나 그 함수를 실행해 스스로 유효한 프리미엄 키를 만들어낼 수 있는 치명적 결함**으로 확인되었다. 비대칭 서명(Ed25519) 같은 보완책도 "서버만 아는 개인키"가 필요하다는 점에서 결국 원격 검증 인프라를 요구했기 때문에, 처음부터 Gumroad가 이미 운영 중인 원격 검증 API를 쓰는 것으로 방향을 바꿨다. 상세는 아래 §8-4 참고.

### 8-4. 실제 적용된 방식: Gumroad License Verification API 실시간 검증 (2026-07-05, 3회차)

`calculators.js`의 `requirePremiumLicense()` / `verifyGumroadLicense()`가 실제로 구현·테스트된 최종 방식이다.

- **호출 대상**: `POST https://api.gumroad.com/v2/licenses/verify` (파라미터: `product_permalink`, `license_key`) — Gumroad가 공개 제공하는 API 키 불필요 엔드포인트.
- **왜 안전한가**: 검증 판단이 로컬 코드가 아니라 Gumroad 서버에서 이뤄진다. 이 파일을 통째로 npm/GitHub에 공개해도, 실제로 그 Gumroad 상품을 결제해 발급받은 키가 아니면 통과하지 않는다 — v1.0.0처럼 "소스를 읽고 스스로 키를 계산"하는 우회가 원천적으로 불가능하다.
- **fail-closed 설계** (4가지 모두 코드로 구현·`test-calculators.js`에서 검증됨):
  1. `GUMROAD_PRODUCT_PERMALINK` 미설정 → "프리미엄 상품 준비 중" 메시지로 차단 (아직 Gumroad 상품이 없는 현재 상태를 안전하게 반영).
  2. `KR_FINANCE_LICENSE_KEY` 미설정 → 네트워크 호출 없이 즉시 차단.
  3. Gumroad API 네트워크 호출 실패/타임아웃(8초) → **반드시 차단** (장애를 "우회 성공"으로 오인하지 않도록 함).
  4. Gumroad가 유효하다고 응답해도 `purchase.refunded`/`chargebacked`/`disputed`/`subscription_cancelled_at`이면 차단.
- **테스트 방법**: 실제 네트워크 호출 없이 `calc._internal.setFetchForTesting(mockFn)`으로 fetch를 목(mock) 처리해 5가지 시나리오(준비 안 됨/키 없음/유효/무효/환불됨/네트워크 오류)를 모두 검증했다.
- **사용자가 직접 해야 할 일**: Gumroad에서 실제 상품(월 9,900원 구독 또는 라이선스 키 자동 발급 옵션 켠 상품)을 개설하고, 그 상품의 permalink를 `GUMROAD_PRODUCT_PERMALINK` 환경변수로 설정하는 것뿐이다. 이 설정이 없으면 프리미엄 도구는 "준비 중" 상태로 안전하게 막혀 있으므로, **지금 당장 배포해도 위조 키로 프리미엄 기능이 뚫릴 위험은 없다.**
