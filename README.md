# mcp-finance-tools — 한국형 금융 계산기 MCP 서버

한국 세법·근로기준법·금융 규제에 특화된 계산기를 [Model Context Protocol(MCP)](https://modelcontextprotocol.io) 도구로 제공하는 서버입니다. Claude Desktop, Claude Code, Cursor 등 MCP를 지원하는 AI 에이전트가 이 서버를 호출해 4대보험, 연봉 실수령액, 퇴직금, 양도소득세, DSR/DTI, 환율 변환, 청약 가점을 계산할 수 있습니다.

영어권에서 만들어진 범용 MCP 서버들은 한국 세법/보험/부동산 도메인을 다루지 않습니다. 이 서버는 그 빈틈을 겨냥한 "한국형 도메인 특화" MCP 서버입니다.

---

## 한국어 안내

### 설치 및 실행 (npx)

별도 설치 없이 `npx`로 바로 실행할 수 있습니다 (Claude Desktop / Cursor 등의 MCP 설정 파일에 아래처럼 등록):

```json
{
  "mcpServers": {
    "kr-finance-tools": {
      "command": "npx",
      "args": ["-y", "mcp-finance-tools"],
      "env": {
        "GUMROAD_PRODUCT_PERMALINK": "Gumroad 프리미엄 상품 permalink (선택, 프리미엄 도구 사용 시 필요)",
        "KR_FINANCE_LICENSE_KEY": "발급받은 프리미엄 라이선스 키 (선택)"
      }
    }
  }
}
```

로컬 개발/테스트 시:

```bash
npm install
node index.js
```

### 도구 목록

MCP 도구 이름(tool name) 표준은 영문/숫자/`_`/`-`/`.`만 허용합니다. 그래서 도구 식별자는 영문으로 짓고, 한국어 명칭은 title/설명에 표기했습니다.

#### 무료 도구 (3종 — 라이선스 불필요)

| 도구 이름 (식별자) | 한국어 명칭 | 설명 |
|---|---|---|
| `calc_4major_insurance` | 4대보험 계산기 | 월급 입력 → 국민연금(4.5%) / 건강보험(3.545%+장기요양보험료) / 고용보험(0.9%) 근로자 부담분 계산 |
| `calc_annual_salary_net` | 연봉 실수령액 계산기 | 연봉 입력 → 4대보험 + 간이 소득세/지방소득세 공제 후 월/연 실수령액 추정 |
| `calc_severance_pay` | 퇴직금 계산기 | 근속연수 + 최근 3개월 급여합계 입력 → 표준 퇴직금 공식(1일 평균임금 × 30일 × 근속연수) 계산 |

**예시 (`calc_annual_salary_net`):**

```json
{ "연봉": 40000000 }
```
→ 월 실수령액 약 2,878,295원, 연 실수령액 약 34,539,540원 (근사치. 근로소득공제 구간표 + 종합소득세 누진구조 + 근로소득세액공제를 반영한 계산, 1인 가구/표준공제 전제)

#### 프리미엄 도구 (4종 — Gumroad 라이선스 실시간 검증 필요, 월 9,900원)

| 도구 이름 (식별자) | 한국어 명칭 | 설명 |
|---|---|---|
| `calc_capital_gains_tax_simple` | 양도소득세 간이 계산기 | 부동산 양도차익 + 보유기간(+보유주택수) 입력 → 간이 세율 구간 기준 양도소득세 근사 계산. 1주택+2년 이상 보유 시 비과세 가능성 경고 표시 |
| `calc_dsr_dti` | DSR/DTI 계산기 | 연소득 + 기존 대출 상환액 + 신규 대출 조건(원금/금리/만기) 입력 → DSR·DTI 비율 및 대출 한도 계산 |
| `calc_fx_convert` | 환율 변환 계산기 | 환율을 직접 입력하면 그 값을, 입력하지 않으면 무료 공개 API(open.er-api.com)로 실시간 환율을 조회해 통화 변환 |
| `calc_housing_subscription_score` | 청약 가점 계산기 | 무주택기간(32점)+부양가족수(35점)+청약통장 가입기간(17점) → 84점 만점 청약 가점 계산 |

**예시 (`calc_dsr_dti`):**

```json
{
  "연소득": 60000000,
  "신규대출_원금": 300000000,
  "신규대출_연이율": 4,
  "신규대출_만기년": 30
}
```
→ 월 상환액 약 1,432,246원, DSR 약 28.6%, DTI 약 20% (근사치)

### 무료/프리미엄 구분 및 라이선스 (v1.1.0 — Gumroad 실시간 검증으로 전환)

프리미엄 도구 4종은 실행할 때마다 **Gumroad License Verification API**(`https://api.gumroad.com/v2/licenses/verify`, API 키 불필요한 공개 엔드포인트)를 호출해 라이선스를 실시간으로 검증합니다.

- `GUMROAD_PRODUCT_PERMALINK` 환경변수(서버 운영자가 설정)가 없으면 → "프리미엄 상품 준비 중" 메시지로 안전하게 차단합니다(fail-closed).
- `KR_FINANCE_LICENSE_KEY` 환경변수(구매자가 설정)가 없으면 → 네트워크 호출 없이 즉시 "구매 필요" 메시지를 반환합니다.
- 두 값이 모두 있으면 Gumroad 서버에 실제로 결제·발급 여부를 조회합니다. 환불(refunded)/이의제기(chargebacked·disputed)/구독취소(subscription_cancelled_at) 상태인 키는 거부됩니다.
- **네트워크 호출이 실패하거나 타임아웃되어도 라이선스를 통과시키지 않습니다** (fail-closed 원칙 — 장애를 "우회 성공"으로 오인하지 않도록 설계).

**v1.0.0에서 바뀐 이유**: v1.0.0은 로컬 HMAC-SHA256 체크섬으로 자체 검증하는 방식이었는데, 이 코드 전체가 npm/GitHub에 그대로 공개되어 있어 검증 로직과 비밀키가 함께 노출되었습니다. 즉 소스를 읽을 수 있는 사람은 누구나 유효한 "프리미엄 키"를 스스로 만들어낼 수 있는 근본적 결함이었습니다. v1.1.0은 검증 판단 자체를 로컬 코드가 아니라 Gumroad 서버로 옮겨, 실제로 결제하고 Gumroad가 발급한 키만 통과하도록 바꿨습니다 — 소스코드를 전부 공개해도 위조가 불가능합니다.

### 주의사항 (정확성, v1.1.0 개선)

- 모든 계산은 **2026년 7월 고시 기준 요율/구간**을 반영했으나, 세무/재무 자문을 대체하지 않는 근사 계산입니다.
- **4대보험**: 국민연금 기준소득월액 상한(6,590,000원)/하한(410,000원)을 반영했습니다(2026.7~2027.6 고시 기준). 2026년 확정 요율(국민연금 근로자부담 4.75%, 건강보험 3.595%, 장기요양 13.14%)을 사용합니다.
- **연봉 실수령액**: 근로소득공제 구간표 + 종합소득세 누진구조 + 근로소득세액공제(한도 포함)를 반영한 근사 공식을 사용합니다. **전제: 1인 가구, 본인 기본공제+표준세액공제(13만원)만 적용** — 부양가족 추가공제, 신용카드 소득공제, 보험료·의료비·교육비 등 특별세액공제는 반영하지 않았습니다. 여전히 실제 국세청 "근로소득 간이세액표"·연말정산 결과와 차이가 있을 수 있습니다.
- **양도소득세**: `보유주택수`(기본값 1) 입력을 지원합니다. 1주택+보유기간 2년 이상이면 1세대1주택 비과세 대상일 가능성이 높다는 경고를 표시하지만, 실거주 요건·조정대상지역 여부 등은 자동 판정할 수 없어 과세를 가정한 참고용 계산도 함께 제공합니다. 다주택자 중과·조정대상지역 여부는 미반영.
- **환율변환**: 환율을 직접 입력하면 그 값을 우선 사용하고(오프라인 폴백), 입력하지 않으면 무료 공개 API(open.er-api.com)로 실시간 환율을 조회합니다.
- **이 서버는 세무/재무 자문을 대체하지 않습니다.** 실제 의사결정 전 반드시 세무사, 회계사, 금융기관 등 전문가와 상담하십시오.

---

## English

`mcp-finance-tools` is an MCP (Model Context Protocol) server exposing Korea-specific financial calculators — national pension, health/employment insurance, take-home pay estimation, severance pay, capital gains tax (real estate), DSR/DTI loan-limit ratios, and a simple FX converter — as tools that any MCP-compatible AI agent (Claude Desktop, Claude Code, Cursor, etc.) can call.

### Install & run

```json
{
  "mcpServers": {
    "kr-finance-tools": {
      "command": "npx",
      "args": ["-y", "mcp-finance-tools"],
      "env": {
        "GUMROAD_PRODUCT_PERMALINK": "your Gumroad product permalink (set by operator)",
        "KR_FINANCE_LICENSE_KEY": "your premium key (optional)"
      }
    }
  }
}
```

Local dev: `npm install && node index.js` (stdio transport). Requires Node.js >= 18 (uses global `fetch`).

### Tools

**Free (3):** `calc_4major_insurance`, `calc_annual_salary_net`, `calc_severance_pay` — run without any license.

**Premium (4, requires a Gumroad-verified `KR_FINANCE_LICENSE_KEY`):** `calc_capital_gains_tax_simple` (now accepts `보유주택수`/house-count for a one-house non-taxable warning), `calc_dsr_dti`, `calc_fx_convert` (now supports live rate lookup via open.er-api.com when no rate is supplied), `calc_housing_subscription_score`.

### License gating (v1.1.0 — real-time Gumroad server verification, fail-closed)

v1.0.0 verified licenses with a local HMAC-SHA256 checksum baked into the same source code that ships on npm/GitHub — meaning anyone reading the code could generate their own "valid" key. v1.1.0 replaces this with a runtime call to the **Gumroad License Verification API** (`POST https://api.gumroad.com/v2/licenses/verify`, no API key required): only keys actually issued by Gumroad for a real purchase pass, because verification happens on Gumroad's server, not in the shipped code.

- No `GUMROAD_PRODUCT_PERMALINK` set → blocked with a "premium product not yet configured" message (fail-closed).
- No `KR_FINANCE_LICENSE_KEY` set → blocked immediately, no network call.
- Network failure/timeout while calling Gumroad → **blocked, never passed through** (fail-closed — a network hiccup must never look like a successful check).
- Gumroad reports the purchase as refunded/chargebacked/disputed/subscription-cancelled → blocked.

### Accuracy disclaimer (v1.1.0 improvements)

All figures use **July 2026 published rates/brackets** but remain simplified approximations, not a substitute for professional advice.

- **4 major insurance**: national pension now respects the 기준소득월액 cap (6,590,000 KRW) / floor (410,000 KRW) for the 2026.7–2027.6 period, and uses the confirmed 2026 rates (pension 4.75%, health 3.595%, long-term care 13.14% of health premium).
- **Take-home pay**: now models the actual 근로소득공제 bracket table, progressive income-tax brackets, and 근로소득세액공제 (with its cap) instead of an arbitrary flat-rate approximation. **Assumes a single-person household with only the basic personal deduction + standard tax credit** — dependent deductions, credit-card deductions, and itemized special tax credits are not modeled.
- **Capital gains tax**: accepts an optional `보유주택수` (house count, default 1). If house count ≤ 1 and holding period ≥ 2 years, it now surfaces a "likely eligible for one-house non-taxable treatment — confirm with a tax accountant" warning alongside a reference taxable-scenario calculation (full automatic exemption determination is not possible).
- **FX conversion**: if you supply a rate, it's used as-is (offline fallback); if you omit it, a free no-key API (open.er-api.com) is queried for a live rate.

This tool does not replace professional tax or financial advice — consult a licensed tax accountant (세무사) or financial advisor before making real decisions.

---

## 파일 구성

- `package.json` — npm 패키지 정의 (`bin` 엔트리 포함, `npx`로 실행 가능)
- `index.js` — MCP 서버 메인 파일 (stdio transport, 7개 tool 등록)
- `calculators.js` — 계산 로직 순수 함수 모음 + Gumroad 실시간 라이선스 검증 로직 (MCP 프로토콜과 무관, 단독 테스트 가능)
- `test-calculators.js` — 7개 계산기 + Gumroad 라이선스 게이트(목 fetch로 검증)를 MCP 프로토콜 없이 직접 호출하는 스모크 테스트
- `monetization-plan.md` — 수익화 전략 + 라이선스 검증 설계 문서 (v1.1.0: Gumroad 실시간 검증으로 갱신)
- `marketplace-metadata.md` — Smithery/Glama/MCP.so 등록용 메타데이터 정리
- `DEPLOY_STEPS.md` — GitHub push / npm publish / 마켓플레이스 등록 실행 명령어 안내 (사용자 직접 실행용)
- `.gitignore` — `node_modules` 등 커밋 제외 목록
