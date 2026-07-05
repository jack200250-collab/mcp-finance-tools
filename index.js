#!/usr/bin/env node
"use strict";
/**
 * 한국형 금융 계산기 MCP 서버 (mcp-finance-tools)
 * -----------------------------------------------------------------------
 * Model Context Protocol(MCP) stdio 서버. Claude Desktop, Cursor 등 MCP를
 * 지원하는 AI 에이전트가 이 서버를 도구(tool)로 호출해 한국형 금융 계산을
 * 수행할 수 있습니다.
 *
 * 무료 도구(1~3): calc_4major_insurance(4대보험), calc_annual_salary_net(연봉실수령액),
 *                  calc_severance_pay(퇴직금)
 * 프리미엄 도구(4~7): calc_capital_gains_tax_simple(양도소득세 간이), calc_dsr_dti(DSR/DTI),
 *                  calc_fx_convert(환율변환), calc_housing_subscription_score(청약 가점)
 *   -> 매 호출 시 Gumroad License Verification API로 실시간 검증(process.env
 *      GUMROAD_PRODUCT_PERMALINK + KR_FINANCE_LICENSE_KEY 필요) 후에만 동작합니다.
 *
 * 참고: MCP 도구 이름(tool name)은 표준상 A-Z, a-z, 0-9, _, -, . 만 허용되어
 * (한글 등 비ASCII 문자를 쓰면 일부 MCP 클라이언트/마켓플레이스와 호환성
 * 문제가 발생할 수 있음) 도구 식별자는 영문으로 짓고, 한국어 이름은
 * title/description에 명시했습니다.
 *
 * 외부 네트워크 호출: (1) 환율변환 도구는 사용자가 환율을 입력하지 않으면
 * 무료 공개 API(open.er-api.com)로 실시간 환율을 조회합니다. (2) 프리미엄
 * 도구 4종은 매 호출 시 Gumroad License Verification API로 라이선스를
 * 검증합니다(위조 방지를 위해 로컬 시크릿 검증 방식을 사용하지 않음).
 * -----------------------------------------------------------------------
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const calc = require("./calculators.js");

const server = new McpServer({
  name: "mcp-finance-tools",
  version: "1.1.0",
  title: "한국형 금융 계산기 MCP 서버",
});

function textResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

// 프리미엄 게이트 실패를 알리기 위한 마커 에러 (핸들러보다 먼저 선언)
// requirePremiumLicense()가 반환하는 상황별 메시지(준비 중/구매 필요/
// 네트워크 오류/환불됨 등)를 그대로 담아 사용자에게 보여준다.
class PremiumRequired extends Error {
  constructor(message) {
    super(message || calc.PREMIUM_PURCHASE_MESSAGE);
    this.name = "PremiumRequired";
    this.premiumMessage = message || calc.PREMIUM_PURCHASE_MESSAGE;
  }
}

function handleErrors(fn) {
  return async (args) => {
    try {
      const result = await fn(args);
      return textResult(result);
    } catch (err) {
      if (err instanceof PremiumRequired) {
        // 프리미엄 게이트: 정상적인 안내 응답으로 처리 (isError 아님)
        return { content: [{ type: "text", text: err.premiumMessage }] };
      }
      return {
        content: [{ type: "text", text: `계산 오류: ${err.message}` }],
        isError: true,
      };
    }
  };
}

// ------------------------------------------------------------------
// 무료 도구 1: 4대보험 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_4major_insurance",
  {
    title: "4대보험 계산기 (무료)",
    description:
      "[4대보험] 월급을 입력하면 국민연금(4.5%), 건강보험(3.545%+장기요양보험료), " +
      "고용보험(0.9%) 근로자 부담분을 계산합니다. 2026년 근사 요율 기준.",
    inputSchema: {
      월급: z.number().positive().describe("세전 월급 (원)"),
    },
  },
  handleErrors(calc.calc4대보험)
);

// ------------------------------------------------------------------
// 무료 도구 2: 연봉 실수령액 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_annual_salary_net",
  {
    title: "연봉 실수령액 계산기 (무료)",
    description:
      "[연봉실수령액] 연봉을 입력하면 4대보험과 간이 소득세/지방소득세를 공제한 " +
      "월/연 실수령액을 추정합니다. 2026년 기준 간이세액표 근사치를 사용하며, " +
      "정확한 국세청 세액표 기준이 아닙니다.",
    inputSchema: {
      연봉: z.number().positive().describe("세전 연봉 (원)"),
      비과세액: z
        .number()
        .nonnegative()
        .optional()
        .describe("월 비과세 소득 (식대 등, 원). 기본값 0"),
    },
  },
  handleErrors(calc.calc연봉실수령액)
);

// ------------------------------------------------------------------
// 무료 도구 3: 퇴직금 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_severance_pay",
  {
    title: "퇴직금 계산기 (무료)",
    description:
      "[퇴직금] 근속연수와 최근 3개월 급여합계를 입력하면 표준 퇴직금 공식" +
      "(1일 평균임금 × 30일 × 근속연수)으로 예상 퇴직금을 계산합니다.",
    inputSchema: {
      근속연수: z.number().positive().describe("근속연수 (예: 3.5)"),
      최근3개월_급여합계: z
        .number()
        .positive()
        .describe("최근 3개월간 지급된 급여 총액 (원, 상여금 등 포함 가능)"),
      최근3개월_일수: z
        .number()
        .positive()
        .optional()
        .describe("최근 3개월의 총 일수 (기본값 90일)"),
    },
  },
  handleErrors(calc.calc퇴직금)
);

// ------------------------------------------------------------------
// 프리미엄 도구 4: 양도소득세 간이 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_capital_gains_tax_simple",
  {
    title: "양도소득세 간이 계산기 (프리미엄)",
    description:
      "[프리미엄/양도소득세 간이] 부동산 양도차익과 보유기간을 입력하면 간이 " +
      "세율 구간으로 양도소득세를 근사 계산합니다. 보유주택수(기본값 1)를 함께 " +
      "입력하면 1세대1주택 비과세 가능성 경고도 표시합니다. 실제 세무 자문이 아닙니다. " +
      "Gumroad 라이선스 실시간 검증(KR_FINANCE_LICENSE_KEY)이 필요합니다.",
    inputSchema: {
      양도차익: z.number().positive().describe("양도가액 - 취득가액 - 필요경비 (원)"),
      보유기간_년: z.number().nonnegative().describe("보유기간 (년, 예: 2.5)"),
      보유주택수: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("양도 시점 기준 보유주택수 (기본값 1). 1주택+2년 이상 보유 시 비과세 가능성 경고 표시"),
    },
  },
  handleErrors(async (args) => {
    const gate = await calc.requirePremiumLicense();
    if (!gate.ok) throw new PremiumRequired(gate.message);
    return calc.calc양도소득세_간이(args);
  })
);

// ------------------------------------------------------------------
// 프리미엄 도구 5: DSR/DTI 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_dsr_dti",
  {
    title: "DSR/DTI 계산기 (프리미엄)",
    description:
      "[프리미엄/DSR·DTI] 연소득, 기존 대출 상환액, 신규 대출 조건(원금/금리/만기)을 " +
      "입력하면 DSR·DTI 비율과 대출 한도를 계산합니다. " +
      "Gumroad 라이선스 실시간 검증(KR_FINANCE_LICENSE_KEY)이 필요합니다.",
    inputSchema: {
      연소득: z.number().positive().describe("연소득 (원)"),
      기존대출_연간원리금상환액: z
        .number()
        .nonnegative()
        .optional()
        .describe("기존 대출의 연간 원리금 상환액 합계 (원, 기본값 0)"),
      기존대출_연간이자상환액: z
        .number()
        .nonnegative()
        .optional()
        .describe("기존 대출의 연간 이자 상환액 합계 (원, DTI 계산용, 기본값 0)"),
      신규대출_원금: z.number().positive().describe("신규 대출 원금 (원)"),
      신규대출_연이율: z.number().nonnegative().describe("신규 대출 연이율 (%, 예: 4.5)"),
      신규대출_만기년: z.number().positive().describe("신규 대출 만기 (년)"),
    },
  },
  handleErrors(async (args) => {
    const gate = await calc.requirePremiumLicense();
    if (!gate.ok) throw new PremiumRequired(gate.message);
    return calc.calcDSR_DTI(args);
  })
);

// ------------------------------------------------------------------
// 프리미엄 도구 6: 환율 변환 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_fx_convert",
  {
    title: "환율 변환 계산기 (프리미엄)",
    description:
      "[프리미엄/환율변환] 환율을 직접 입력하면 그 값으로, 입력하지 않으면 무료 공개 API " +
      "(open.er-api.com)로 실시간 환율을 조회해 통화를 변환합니다. " +
      "Gumroad 라이선스 실시간 검증(KR_FINANCE_LICENSE_KEY)이 필요합니다.",
    inputSchema: {
      금액: z.number().nonnegative().describe("변환할 금액"),
      기준통화: z.string().min(1).describe("기준 통화 코드 (예: USD)"),
      대상통화: z.string().min(1).describe("대상 통화 코드 (예: KRW)"),
      환율: z
        .number()
        .positive()
        .optional()
        .describe(
          "1 기준통화 = 환율 × 1 대상통화. 생략하면 open.er-api.com에서 실시간 환율을 조회합니다."
        ),
    },
  },
  handleErrors(async (args) => {
    const gate = await calc.requirePremiumLicense();
    if (!gate.ok) throw new PremiumRequired(gate.message);
    return calc.calc환율변환(args);
  })
);

// ------------------------------------------------------------------
// 프리미엄 도구 7: 청약 가점 계산기
// ------------------------------------------------------------------
server.registerTool(
  "calc_housing_subscription_score",
  {
    title: "청약 가점 계산기 (프리미엄)",
    description:
      "[프리미엄/청약가점] 무주택기간, 부양가족수, 청약통장 가입기간을 입력하면 " +
      "주택청약 가점제 표준 산정표(무주택기간 32점+부양가족 35점+청약통장 17점, " +
      "84점 만점)로 청약 가점을 계산합니다. " +
      "Gumroad 라이선스 실시간 검증(KR_FINANCE_LICENSE_KEY)이 필요합니다.",
    inputSchema: {
      무주택기간_년: z.number().nonnegative().describe("무주택기간 (년, 예: 5.5)"),
      부양가족수: z
        .number()
        .int()
        .nonnegative()
        .describe("부양가족수 (본인 제외 세대원 수, 정수)"),
      청약통장가입기간_년: z
        .number()
        .nonnegative()
        .describe("청약통장(주택청약종합저축 등) 가입기간 (년, 예: 10)"),
    },
  },
  handleErrors(async (args) => {
    const gate = await calc.requirePremiumLicense();
    if (!gate.ok) throw new PremiumRequired(gate.message);
    return calc.calc청약가점(args);
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio 서버이므로 stdout에는 아무것도 출력하지 않는다 (JSON-RPC 프로토콜 전용).
  // 상태 확인용 로그는 stderr로만 출력.
  console.error("[mcp-finance-tools] MCP 서버가 stdio transport로 연결되었습니다.");
}

main().catch((err) => {
  console.error("[mcp-finance-tools] 서버 시작 실패:", err);
  process.exit(1);
});
