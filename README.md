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
→ 월 실수령액 약 2,909,863원, 연 실수령액 약 34,918,356원 (근사치)

#### 프리미엄 도구 (4종 — 라이선스 키 필요, 월 9,900원)

| 도구 이름 (식별자) | 한국어 명칭 | 설명 |
|---|---|---|
| `calc_capital_gains_tax_simple` | 양도소득세 간이 계산기 | 부동산 양도차익 + 보유기간 입력 → 간이 세율 구간 기준 양도소득세 근사 계산 |
| `calc_dsr_dti` | DSR/DTI 계산기 | 연소득 + 기존 대출 상환액 + 신규 대출 조건(원금/금리/만기) 입력 → DSR·DTI 비율 및 대출 한도 계산 |
| `calc_fx_convert` | 환율 변환 계산기 | 사용자가 제공한 환율값 기준 통화 변환 (실시간 API 연동 없음) |
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

### 무료/프리미엄 구분 및 라이선스

프리미엄 도구 4종은 실행 전 `process.env.KR_FINANCE_LICENSE_KEY` 환경변수를 검사합니다.

- 키가 없거나 유효하지 않으면: "프리미엄 라이선스가 필요합니다" 안내 메시지와 구매 링크를 반환합니다 (계산을 수행하지 않음).
- 키는 `KRFIN-XXXX-YYYY-ZZZZ` 형식이며, `ZZZZ`는 앞 두 세그먼트의 **HMAC-SHA256 체크섬**입니다(`calculators.js`의 `generateLicenseKey()`로 생성). 형식만 맞고 체크섬이 틀린 임의 문자열(예: `KRFIN-AB12-CD34-EF56`)은 거부됩니다.

**중요 — 이 라이선스 검증은 결제 백엔드 없이 동작하는 시뮬레이션입니다.** 체크섬 덕분에 "아무 문자열이나 통과"하는 문제는 해결했지만, 발급 대장이 없어 환불/구독 취소된 키를 개별 차단할 수는 없습니다. **실제 서비스로 운영하려면 Gumroad(또는 다른 결제 시스템)와 연동해 결제 완료 시 고유 라이선스 키를 발급하고, 서버 측에서 발급/취소 대장을 조회해 검증하는 구조로 교체해야 합니다.** 상세 설계는 `monetization-plan.md` §8 참고.

### 주의사항 (정확성)

- 모든 계산은 **2026년 기준 근사치/근사 공식**이며, 국민연금공단·국민건강보험공단·국세청의 공식 고시 수치를 그대로 반영한 것이 아닙니다.
- 연봉 실수령액의 소득세는 실제 국세청 "근로소득 간이세액표"가 아니라 급여 구간별 근사 실효세율을 사용합니다.
- 양도소득세는 1세대1주택 비과세, 다주택자 중과, 조정대상지역 여부를 반영하지 않은 매우 단순화된 모델입니다.
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
      "env": { "KR_FINANCE_LICENSE_KEY": "your premium key (optional)" }
    }
  }
}
```

Local dev: `npm install && node index.js` (stdio transport).

### Tools

**Free (3):** `calc_4major_insurance`, `calc_annual_salary_net`, `calc_severance_pay` — run without any license.

**Premium (4, requires `KR_FINANCE_LICENSE_KEY`):** `calc_capital_gains_tax_simple`, `calc_dsr_dti`, `calc_fx_convert`, `calc_housing_subscription_score`.

All calculators are pure, deterministic formulas — no external API calls, no network dependency (FX conversion uses a user-supplied rate, not a live feed).

### License gating (self-verifying checksum, no payment backend yet)

Premium tools check `process.env.KR_FINANCE_LICENSE_KEY` against the format `KRFIN-XXXX-YYYY-ZZZZ`, where `ZZZZ` is an HMAC-SHA256 checksum of the first two segments (see `generateLicenseKey()` in `calculators.js`). Arbitrary strings that merely match the shape are rejected. This closes the "any string passes" gap from v1, but there is still no issuance ledger to revoke refunded keys. **Before shipping to production, wire this up to a real payment processor (Gumroad, etc.)** that issues a unique key per paid subscription and — ideally — lets the server check revocation status remotely. See `monetization-plan.md` §8 for the full design.

### Accuracy disclaimer

All figures are **2026 approximations** using simplified formulas, not official withholding tables from Korean tax/insurance authorities. This tool does not replace professional tax or financial advice — consult a licensed tax accountant (세무사) or financial advisor before making real decisions.

---

## 파일 구성

- `package.json` — npm 패키지 정의 (`bin` 엔트리 포함, `npx`로 실행 가능)
- `index.js` — MCP 서버 메인 파일 (stdio transport, 7개 tool 등록)
- `calculators.js` — 계산 로직 순수 함수 모음 + 라이선스 키 생성/검증 로직 (MCP 프로토콜과 무관, 단독 테스트 가능)
- `test-calculators.js` — 7개 계산기 + 라이선스 체크섬 검증을 MCP 프로토콜 없이 직접 호출하는 스모크 테스트
- `monetization-plan.md` — 수익화 전략 + 라이선스 발급 자동화 설계 문서
- `marketplace-metadata.md` — Smithery/Glama/MCP.so 등록용 메타데이터 정리
- `DEPLOY_STEPS.md` — GitHub push / npm publish / 마켓플레이스 등록 실행 명령어 안내 (사용자 직접 실행용)
- `.gitignore` — `node_modules` 등 커밋 제외 목록
