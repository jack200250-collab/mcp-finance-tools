# 마켓플레이스 등록 메타데이터 (Smithery / Glama / MCP.so)

작성일: 2026-07-04. 이 문서는 각 플랫폼에 실제로 등록할 때 그대로 복사해 넣을 수 있는 텍스트/메타데이터를 정리한 것이다. **계정 가입·실제 제출 폼 작성은 사용자가 직접 해야 한다** — 이 세션 툴에는 브라우저 자동화나 각 플랫폼 계정 인증 수단이 없다.

---

## 공통 핵심 정보 (모든 플랫폼에서 재사용)

- **패키지명**: `mcp-finance-tools`
- **한 줄 소개(한국어)**: 한국형 금융 계산기 MCP 서버 — 4대보험, 연봉 실수령액, 퇴직금, 양도소득세, DSR/DTI, 환율 변환, 청약 가점을 AI 에이전트 도구로 제공합니다.
- **한 줄 소개(영어)**: Korea-specific financial calculators (4 major insurance, take-home pay, severance, capital gains tax, DSR/DTI, FX, housing subscription score) as MCP tools.
- **GitHub 저장소 URL**: `https://github.com/<사용자 GitHub 계정>/mcp-finance-tools` (실제 저장소 생성 후 교체 — `DEPLOY_STEPS.md` 참고)
- **npm 패키지 URL**: `https://www.npmjs.com/package/mcp-finance-tools` (`npm publish` 이후 활성화)
- **라이선스**: MIT
- **카테고리/태그**: Finance, Korea, Tax, Insurance, Real Estate, Calculator, Developer Tools
- **설치 명령**: `npx -y mcp-finance-tools`
- **필요 환경변수**: `GUMROAD_PRODUCT_PERMALINK`(서버 운영자 설정, 프리미엄 도구 활성화용), `KR_FINANCE_LICENSE_KEY`(구매자 설정, 프리미엄 도구 4종에만 필요 — Gumroad API로 실시간 검증)
- **가격 모델**: 무료 3종 + 프리미엄 4종(월 9,900원 구독, Gumroad 라이선스 키)
- **작성자 연락처**: (등록 시 GitHub 프로필 또는 이메일 `jack200250@gmail.com` 중 공개 원하는 것 선택해 기입)

---

## 1. Smithery (smithery.ai)

Smithery는 MCP 서버 디스커버리 1순위 마켓플레이스로, 저장소를 연결하면 자동 설치 스크립트를 생성해준다. 등록 시 보통 `smithery.yaml`(또는 `smithery.json`) 설정 파일과 GitHub 저장소 연결을 요구한다.

### 등록 폼에 입력할 필드

| 필드 | 값 |
|---|---|
| Name | mcp-finance-tools |
| Display Name | 한국형 금융 계산기 (KR Finance Tools) |
| Description | 한국 세법·근로기준법·부동산 세제에 특화된 금융 계산기 7종을 제공하는 MCP 서버. 무료 3종(4대보험/연봉실수령액/퇴직금) + 프리미엄 4종(양도소득세/DSR·DTI/환율변환/청약가점). |
| Repository | https://github.com/\<계정\>/mcp-finance-tools |
| Category | Finance / Productivity |
| Tags | korea, finance, tax, insurance, real-estate, calculator, salary, mcp |
| Runtime | Node.js (stdio transport) |
| Install command | npx -y mcp-finance-tools |
| Config (env vars) | `GUMROAD_PRODUCT_PERMALINK` (operator-set, string), `KR_FINANCE_LICENSE_KEY` (optional, string) |

### 참고용 `smithery.yaml` 예시 (저장소 루트에 추가 시 사용할 초안)

```yaml
startCommand:
  type: stdio
  configSchema:
    type: object
    properties:
      GUMROAD_PRODUCT_PERMALINK:
        type: string
        description: "Gumroad 프리미엄 상품 permalink (서버 운영자 설정, 없으면 프리미엄 도구가 '준비 중' 상태로 막힘)"
      KR_FINANCE_LICENSE_KEY:
        type: string
        description: "프리미엄 도구(양도소득세/DSR·DTI/환율변환/청약가점) 사용을 위한 라이선스 키 (선택, Gumroad API로 실시간 검증)"
    required: []
  commandFunction: |
    (config) => ({
      command: "npx",
      args: ["-y", "mcp-finance-tools"],
      env: {
        ...(config.GUMROAD_PRODUCT_PERMALINK
          ? { GUMROAD_PRODUCT_PERMALINK: config.GUMROAD_PRODUCT_PERMALINK }
          : {}),
        ...(config.KR_FINANCE_LICENSE_KEY
          ? { KR_FINANCE_LICENSE_KEY: config.KR_FINANCE_LICENSE_KEY }
          : {}),
      }
    })
```

이 예시 파일은 실제 등록 전 Smithery 최신 스펙(https://smithery.ai/docs)을 확인해 필드명을 검증해야 한다 — MCP 마켓플레이스 스펙은 자주 바뀐다.

---

## 2. Glama (glama.ai/mcp/servers)

Glama는 GitHub 저장소 URL을 제출하면 자동으로 메타데이터(README, package.json)를 스캔해 품질 점수를 매기고 카테고리 태그를 붙인다.

### 등록 시 입력/확인할 내용

| 필드 | 값 |
|---|---|
| GitHub URL | https://github.com/\<계정\>/mcp-finance-tools |
| Category | Finance, Korea (직접 선택 가능하면 두 개 다 선택) |
| Short description | Korea-specific financial calculators (insurance, salary, tax, loans, housing) exposed as MCP tools. |
| Keywords (package.json에서 자동 추출됨) | mcp, model-context-protocol, korea, finance, calculator, 4대보험, 연봉실수령액, 퇴직금, 양도소득세, DSR, DTI (→ `청약가점`, `housing-subscription` 추가 권장) |
| README 품질 요건 | 설치 방법, 도구 목록 표, 라이선스 안내가 이미 README.md에 포함되어 있음 (한/영 병기) |

**등록 전 확인**: Glama는 저장소의 GitHub 스타 수·최근 커밋 활동을 랭킹에 반영하므로, `DEPLOY_STEPS.md`의 GitHub push를 먼저 완료해야 한다.

---

## 3. MCP.so

커뮤니티 큐레이션 디렉토리. 제출 폼이 간단한 편이며, GitHub 저장소와 짧은 설명, 카테고리만 요구하는 경우가 많다.

### 등록 폼에 입력할 필드

| 필드 | 값 |
|---|---|
| Server Name | KR Finance Tools (한국형 금융 계산기) |
| GitHub | https://github.com/\<계정\>/mcp-finance-tools |
| Description | 4대보험·연봉실수령액·퇴직금(무료) + 양도소득세·DSR/DTI·환율변환·청약가점(프리미엄, 월 9,900원) 계산을 제공하는 한국 특화 MCP 서버. |
| Tags | korea, finance, tax, real-estate, calculator |
| Pricing | Freemium (3 free tools, 4 premium tools via license key) |

---

## 4. 아이콘/스크린샷 (설명만 — 실제 이미지 파일은 별도 제작 필요)

현재 아이콘 이미지 파일은 준비되어 있지 않다. 등록 시 필요하다면 아래 컨셉으로 제작을 요청할 수 있다:

- **아이콘**: 정사각형, 검정/골드 팔레트(기존 브랜드 표준과 통일감), 원화(₩) 기호 또는 계산기 아이콘 + 태극 문양 모티프(과하지 않게, 예: 태극 4괘 중 하나만 미니멀하게 활용).
- **스크린샷/데모 GIF**: Claude Desktop에서 "제 연봉 4000만원인데 실수령액 얼마예요?" 질문 → `calc_annual_salary_net` tool 호출 → 답변이 나오는 화면. (실제 캡처는 사용자가 Claude Desktop에 이 MCP 서버를 연결한 뒤 직접 촬영해야 함 — 이 세션 툴로는 Claude Desktop 화면을 캡처할 수 없음.)

---

## 5. 사용자가 직접 해야 할 일 (요약)

1. 위 GitHub URL의 `<계정>` 부분을 실제 GitHub 사용자명으로 교체.
2. `DEPLOY_STEPS.md`대로 GitHub 저장소 생성 + push, npm publish 먼저 완료.
3. Smithery/Glama/MCP.so 각 사이트에 가입 → 위 표의 필드 값을 그대로 복사해 제출 폼 작성.
4. 아이콘 이미지가 필수인 플랫폼이 있다면, 위 컨셉으로 별도 제작 요청(Pillow로 간단한 아이콘은 다음 실행에서 제작 가능).
