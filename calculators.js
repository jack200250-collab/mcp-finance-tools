"use strict";
/**
 * calculators.js
 * -----------------------------------------------------------------------
 * 한국형 금융 계산기 순수 로직 모음 (MCP 프로토콜과 무관).
 * 모든 계산은 결정론적 공식 기반이며, 실제 국세청/공단 고시 수치와 오차가
 * 있을 수 있습니다. 실제 세무/재무 자문 대체용이 아닙니다.
 *
 * 2026년 7월 기준(보건복지부/국세청 공개 고시 자료 기준) 요율/구간을
 * 반영했습니다. 정확한 수치는 매년 변경되므로 실제 급여 계산에는
 * 국민연금공단/국민건강보험공단/국세청 공식 자료를 반드시 확인하십시오.
 *
 * 전제(v1.1.0 기준): 근로소득세 계산은 **1인 가구, 인적공제(본인 기본공제)
 * 및 표준세액공제만 적용**한다고 가정합니다. 부양가족 추가공제, 신용카드
 * 소득공제, 각종 특별세액공제(보장성보험료/의료비/교육비/기부금 등)는
 * 반영하지 않았습니다.
 *
 * v1.1.0 변경 사항:
 *   - 프리미엄 라이선스 검증을 로컬 HMAC 체크섬 방식에서 Gumroad License
 *     Verification API 실시간 조회 방식으로 전환 (아래 §라이선스 검증 참고).
 *   - 국민연금 기준소득월액 상한/하한 반영, 2026년 확정 요율(9.5%,
 *     근로자 부담 4.75%) 반영.
 *   - 연봉 실수령액: 근로소득공제 구간표 + 종합소득세 누진구조 +
 *     근로소득세액공제(한도 포함)를 반영한 근사 공식으로 개선.
 *   - 양도소득세 간이계산기: 보유주택수 입력을 추가해 1세대1주택 비과세
 *     가능성 경고를 표시.
 *   - 환율변환: 사용자가 환율을 입력하지 않으면 무료 공개 API
 *     (open.er-api.com)로 실시간 환율을 조회하는 옵션을 추가.
 * -----------------------------------------------------------------------
 */

// ------------------------------------------------------------------
// 공통 유틸
// ------------------------------------------------------------------

function round(value, digits = 0) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function formatWon(n) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

// ------------------------------------------------------------------
// 1. 4대보험 계산기 (무료)
// ------------------------------------------------------------------
// 2026년 확정 요율(근로자 부담분, 보건복지부 고시 기준):
//   - 국민연금: 4.75% (2026년 전체 요율 9.5%의 절반, 2025년 4.5%에서 인상)
//   - 건강보험: 3.595% (2026년 전체 요율 7.19%의 절반)
//   - 장기요양보험료: 건강보험료의 13.14% (2026년 고시)
//   - 고용보험: 0.9% (근로자 부담분, 2026년 고시 미확정 부분이 있어 2025년
//     수준을 유지한다고 가정 — 확정되면 갱신 필요)
// 국민연금은 기준소득월액 상한/하한이 있다(2026.7.1~2027.6.30 고시 기준
// 상한 6,590,000원 / 하한 410,000원). 월급이 상한을 넘으면 상한액을,
// 하한 미만이면 하한액을 기준으로 국민연금을 계산한다.
// 건강보험도 이론상 상한액이 있으나 매우 높은 금액(월 보수월액 기준
// 수억원대)이라 일반적인 급여 범위에서는 사실상 영향이 없어 미반영.
const RATES = {
  국민연금: 0.0475,
  건강보험: 0.03595,
  장기요양_건강보험대비: 0.1314,
  고용보험: 0.009,
};

const 국민연금_기준소득월액_상한 = 6_590_000; // 2026.7.1~2027.6.30 고시
const 국민연금_기준소득월액_하한 = 410_000; // 2026.7.1~2027.6.30 고시

function calc4대보험({ 월급 }) {
  if (typeof 월급 !== "number" || !isFinite(월급) || 월급 <= 0) {
    throw new Error("월급은 0보다 큰 숫자여야 합니다.");
  }

  const 국민연금_기준소득월액 = Math.min(
    국민연금_기준소득월액_상한,
    Math.max(국민연금_기준소득월액_하한, 월급)
  );
  const 상한적용여부 = 월급 > 국민연금_기준소득월액_상한;
  const 하한적용여부 = 월급 < 국민연금_기준소득월액_하한;

  const 국민연금 = round(국민연금_기준소득월액 * RATES.국민연금);
  const 건강보험 = round(월급 * RATES.건강보험);
  const 장기요양보험료 = round(건강보험 * RATES.장기요양_건강보험대비);
  const 고용보험 = round(월급 * RATES.고용보험);
  const 합계 = 국민연금 + 건강보험 + 장기요양보험료 + 고용보험;

  return {
    입력_월급: 월급,
    국민연금_기준소득월액,
    국민연금_상한적용: 상한적용여부,
    국민연금_하한적용: 하한적용여부,
    국민연금,
    건강보험,
    장기요양보험료,
    고용보험,
    공제합계: 합계,
    세후_월급_4대보험만공제: round(월급 - 합계),
    설명:
      `월급 ${formatWon(월급)} 기준 근로자 부담분 4대보험은 ` +
      `국민연금 ${formatWon(국민연금)}${
        상한적용여부
          ? `(기준소득월액 상한 ${formatWon(국민연금_기준소득월액_상한)} 적용)`
          : 하한적용여부
          ? `(기준소득월액 하한 ${formatWon(국민연금_기준소득월액_하한)} 적용)`
          : ""
      }, 건강보험 ${formatWon(건강보험)}, ` +
      `장기요양보험료 ${formatWon(장기요양보험료)}, 고용보험 ${formatWon(고용보험)}로 ` +
      `총 ${formatWon(합계)}입니다. (2026년 7월 고시 기준 요율. 국민연금 기준소득월액 상한 ${formatWon(
        국민연금_기준소득월액_상한
      )}/하한 ${formatWon(국민연금_기준소득월액_하한)} 반영)`,
  };
}

// ------------------------------------------------------------------
// 2. 연봉 실수령액 계산기 (무료)
// ------------------------------------------------------------------
// v1.1.0: 과거의 "급여 구간별 임의 실효세율 근사" 방식을 버리고, 실제
// 세법 구조를 (단순화하되) 반영한 근사 공식을 사용합니다.
//   총급여 → 근로소득공제(2024년 소득세법 구간표) → 근로소득금액
//   → 종합소득공제(인적공제 1인 + 연금보험료공제 + 사회보험료 특별소득공제)
//   → 과세표준 → 종합소득세 누진세율 → 산출세액
//   → 근로소득세액공제(한도 포함) → 표준세액공제(13만원) → 결정세액(연간)
//   → 12개월로 환산 + 지방소득세(10%)
// 전제: 1인 가구, 부양가족 추가공제·신용카드공제·특별세액공제(보험료/의료비/
// 교육비 등) 미반영. 실제 국세청 "근로소득 간이세액표"와는 여전히 차이가
// 있을 수 있으나, 근로소득공제·세율누진구조·근로소득세액공제라는 실제
// 세법의 핵심 골격은 반영했습니다.

// 근로소득공제 (2024년 소득세법 제47조 구간표, 연간 총급여 기준)
function 근로소득공제(총급여) {
  if (총급여 <= 5_000_000) return 총급여 * 0.7;
  if (총급여 <= 15_000_000) return 3_500_000 + (총급여 - 5_000_000) * 0.4;
  if (총급여 <= 45_000_000) return 7_500_000 + (총급여 - 15_000_000) * 0.15;
  if (총급여 <= 100_000_000) return 12_000_000 + (총급여 - 45_000_000) * 0.05;
  return 14_750_000 + (총급여 - 100_000_000) * 0.02;
}

// 종합소득세 기본세율표(2024년 개정, 과세표준 기준) — 양도소득세 계산과 공유
const 종합소득세_기본세율표 = [
  [14_000_000, 0.06, 0],
  [50_000_000, 0.15, 1_260_000],
  [88_000_000, 0.24, 5_760_000],
  [150_000_000, 0.35, 15_440_000],
  [300_000_000, 0.38, 19_940_000],
  [500_000_000, 0.4, 25_940_000],
  [1_000_000_000, 0.42, 35_940_000],
  [Infinity, 0.45, 65_940_000],
];

function 누진세_산출세액(과세표준, 세율표) {
  let 세율 = 세율표[0][1];
  let 누진공제 = 세율표[0][2];
  for (const [상한, rate, deduction] of 세율표) {
    if (과세표준 <= 상한) {
      세율 = rate;
      누진공제 = deduction;
      break;
    }
  }
  return {
    세율,
    누진공제,
    산출세액: Math.max(0, 과세표준 * 세율 - 누진공제),
  };
}

// 근로소득세액공제 한도(2024년 소득세법 제59조, 총급여 기준)
function 근로소득세액공제_한도(총급여) {
  if (총급여 <= 33_000_000) return 740_000;
  if (총급여 <= 70_000_000) {
    return Math.max(660_000, 740_000 - (총급여 - 33_000_000) * 0.008);
  }
  if (총급여 <= 120_000_000) {
    return Math.max(500_000, 660_000 - (총급여 - 70_000_000) * 0.5);
  }
  return 500_000;
}

function 근로소득세액공제(산출세액, 총급여) {
  const 공제전액 =
    산출세액 <= 1_300_000
      ? 산출세액 * 0.55
      : 1_300_000 * 0.55 + (산출세액 - 1_300_000) * 0.3;
  return Math.min(공제전액, 근로소득세액공제_한도(총급여));
}

const 인적공제_본인 = 1_500_000; // 1인 가구 기본공제(본인)만 가정
const 표준세액공제 = 130_000; // 특별세액공제 미신청 근로자 기본 적용분

function calc연봉실수령액({ 연봉, 비과세액 = 0 }) {
  if (typeof 연봉 !== "number" || !isFinite(연봉) || 연봉 <= 0) {
    throw new Error("연봉은 0보다 큰 숫자여야 합니다.");
  }
  if (typeof 비과세액 !== "number" || 비과세액 < 0) {
    throw new Error("비과세액은 0 이상의 숫자여야 합니다.");
  }

  const 월급 = 연봉 / 12;
  const 과세_월급 = Math.max(0, 월급 - 비과세액);
  const 총급여 = round(과세_월급 * 12); // 연간 과세대상 총급여액

  const insuranceMonthly = calc4대보험({ 월급: 과세_월급 });
  const 연간_국민연금 = round(insuranceMonthly.국민연금 * 12);
  const 연간_건강보험 = round(insuranceMonthly.건강보험 * 12);
  const 연간_장기요양 = round(insuranceMonthly.장기요양보험료 * 12);
  const 연간_고용보험 = round(insuranceMonthly.고용보험 * 12);

  const 근로소득공제액 = round(근로소득공제(총급여));
  const 근로소득금액 = Math.max(0, 총급여 - 근로소득공제액);

  const 연금보험료공제 = 연간_국민연금;
  const 사회보험료_특별소득공제 = 연간_건강보험 + 연간_장기요양 + 연간_고용보험;
  const 종합소득공제 =
    인적공제_본인 + 연금보험료공제 + 사회보험료_특별소득공제;

  const 과세표준 = Math.max(0, round(근로소득금액 - 종합소득공제));
  const { 세율, 산출세액 } = 누진세_산출세액(
    과세표준,
    종합소득세_기본세율표
  );
  const 산출세액_반올림 = round(산출세액);
  const 근로소득세액공제액 = round(
    근로소득세액공제(산출세액_반올림, 총급여)
  );
  const 결정세액_연간 = Math.max(
    0,
    round(산출세액_반올림 - 근로소득세액공제액 - 표준세액공제)
  );
  const 지방소득세_연간 = round(결정세액_연간 * 0.1);

  const 월_근로소득세 = round(결정세액_연간 / 12);
  const 월_지방소득세 = round(지방소득세_연간 / 12);

  const 공제총액 = insuranceMonthly.공제합계 + 월_근로소득세 + 월_지방소득세;
  const 월실수령액 = round(월급 - 공제총액);
  const 연실수령액 = round(월실수령액 * 12);

  return {
    입력_연봉: 연봉,
    월_세전급여: round(월급),
    과세근거: {
      연간_총급여: 총급여,
      근로소득공제액,
      근로소득금액: round(근로소득금액),
      종합소득공제,
      과세표준,
      적용세율: 세율,
      산출세액_연간: 산출세액_반올림,
      근로소득세액공제액,
      표준세액공제,
      결정세액_연간,
    },
    공제내역: {
      국민연금: insuranceMonthly.국민연금,
      건강보험: insuranceMonthly.건강보험,
      장기요양보험료: insuranceMonthly.장기요양보험료,
      고용보험: insuranceMonthly.고용보험,
      근로소득세_근사치: 월_근로소득세,
      지방소득세_근사치: 월_지방소득세,
      공제총액: 공제총액,
    },
    월_실수령액_근사치: 월실수령액,
    연_실수령액_근사치: 연실수령액,
    설명:
      `연봉 ${formatWon(연봉)}(월 ${formatWon(round(월급))}) 기준, ` +
      `근로소득공제·종합소득공제·근로소득세액공제를 반영한 근사 계산 결과 ` +
      `월 실수령액은 약 ${formatWon(월실수령액)}, 연 실수령액은 약 ${formatWon(
        연실수령액
      )}으로 추정됩니다. ` +
      `(전제: 1인 가구, 본인 기본공제+표준세액공제만 적용. 부양가족 추가공제, 신용카드 소득공제, ` +
      `보험료·의료비·교육비 등 특별세액공제는 반영하지 않았습니다. 실제 국세청 간이세액표·연말정산 결과와 차이가 있을 수 있습니다.)`,
  };
}

// ------------------------------------------------------------------
// 3. 퇴직금 계산기 (무료)
// ------------------------------------------------------------------
// 표준 공식: 퇴직금 = 1일 평균임금 × 30일 × (근속연수)
// 1일 평균임금 = 최근 3개월간 지급된 임금 총액 / 최근 3개월간 총 일수
function calc퇴직금({ 근속연수, 최근3개월_급여합계, 최근3개월_일수 = 90 }) {
  if (typeof 근속연수 !== "number" || !isFinite(근속연수) || 근속연수 <= 0) {
    throw new Error("근속연수는 0보다 큰 숫자여야 합니다.");
  }
  if (
    typeof 최근3개월_급여합계 !== "number" ||
    !isFinite(최근3개월_급여합계) ||
    최근3개월_급여합계 <= 0
  ) {
    throw new Error("최근3개월_급여합계는 0보다 큰 숫자여야 합니다.");
  }
  if (
    typeof 최근3개월_일수 !== "number" ||
    !isFinite(최근3개월_일수) ||
    최근3개월_일수 <= 0
  ) {
    throw new Error("최근3개월_일수는 0보다 큰 숫자여야 합니다.");
  }

  const 일평균임금 = 최근3개월_급여합계 / 최근3개월_일수;
  const 퇴직금 = round(일평균임금 * 30 * 근속연수);

  return {
    입력_근속연수: 근속연수,
    입력_최근3개월_급여합계: 최근3개월_급여합계,
    최근3개월_일수: 최근3개월_일수,
    일평균임금: round(일평균임금),
    예상_퇴직금: 퇴직금,
    설명:
      `최근 3개월 급여합계 ${formatWon(
        최근3개월_급여합계
      )}(${최근3개월_일수}일 기준)로 산정한 1일 평균임금은 ${formatWon(
        round(일평균임금)
      )}이며, 근속연수 ${근속연수}년 기준 예상 퇴직금은 약 ${formatWon(
        퇴직금
      )}입니다. (표준 퇴직금 공식: 1일 평균임금 × 30일 × 근속연수. 실제 지급액은 회사 취업규칙, 퇴직연금(DB/DC) 여부에 따라 달라질 수 있습니다.)`,
  };
}

// ------------------------------------------------------------------
// 4. 양도소득세 간이 계산기 (프리미엄)
// ------------------------------------------------------------------
// 매우 단순화한 근사 모델입니다. 다주택자 중과, 조정대상지역 여부 등
// 세부 규정은 전혀 반영하지 않았습니다. 실제 신고 전 반드시 세무사 등
// 전문가와 상담하십시오.
//
// v1.1.0: 완전 자동 비과세 판정은 불가능하므로(실거주 요건, 취득 시점의
// 조정대상지역 여부, 고가주택 12억원 초과분 과세 등 세부 조건이 있음)
// 대신 `보유주택수` 입력을 받아 "1주택 + 보유기간 2년 이상"이면 비과세
// 대상일 가능성이 높다는 경고를 함께 표시하고, 과세를 가정한 참고용
// 계산도 별도로 제공한다.
const 양도소득세_기본공제 = 2_500_000; // 연 250만원

function 장기보유특별공제율(보유기간_년) {
  // 3년 이상부터 연 2%씩, 최대 30% (일반 부동산 기준 근사, 1세대1주택 특례 미반영)
  if (보유기간_년 < 3) return 0;
  return Math.min(0.3, Math.floor(보유기간_년) * 0.02);
}

const 일세대1주택_비과세_안내 =
  "[비과세 가능성 경고] 보유주택수 1채 + 보유기간 2년 이상 조건이 확인되어 " +
  "1세대1주택 비과세(양도가액 12억원 이하분) 대상일 가능성이 높습니다. " +
  "다만 취득 시점의 조정대상지역 여부에 따라 2년 거주 요건이 추가로 필요할 수 있고, " +
  "일시적 2주택·상속주택 등 예외 규정도 있어 이 계산기만으로는 최종 판정이 불가능합니다. " +
  "아래 세액은 '비과세가 적용되지 않는다고 가정'한 참고용 시뮬레이션이며, " +
  "실제 신고 전 반드시 세무사와 확인하십시오.";

function calc양도소득세_간이({ 양도차익, 보유기간_년, 보유주택수 = 1 }) {
  if (typeof 양도차익 !== "number" || !isFinite(양도차익) || 양도차익 <= 0) {
    throw new Error("양도차익은 0보다 큰 숫자여야 합니다.");
  }
  if (
    typeof 보유기간_년 !== "number" ||
    !isFinite(보유기간_년) ||
    보유기간_년 < 0
  ) {
    throw new Error("보유기간_년은 0 이상의 숫자여야 합니다.");
  }
  if (
    typeof 보유주택수 !== "number" ||
    !Number.isInteger(보유주택수) ||
    보유주택수 < 0
  ) {
    throw new Error("보유주택수는 0 이상의 정수여야 합니다. (기본값 1)");
  }

  const 일세대1주택_비과세_참고 =
    보유주택수 <= 1 && 보유기간_년 >= 2 ? 일세대1주택_비과세_안내 : null;

  // 단기 보유 시 단일세율 적용
  if (보유기간_년 < 1) {
    const 과세표준 = Math.max(0, 양도차익 - 양도소득세_기본공제);
    const 세율 = 0.7;
    const 산출세액 = round(과세표준 * 세율);
    const 지방소득세 = round(산출세액 * 0.1);
    return {
      입력_양도차익: 양도차익,
      보유기간_년,
      보유주택수,
      일세대1주택_비과세_참고,
      적용유형: "단기보유(1년 미만) 단일세율 70%",
      과세표준: round(과세표준),
      적용세율: 세율,
      양도소득세_산출세액: 산출세액,
      지방소득세: 지방소득세,
      총부담세액: 산출세액 + 지방소득세,
      설명: `보유기간 1년 미만이므로 단일세율 70%가 적용됩니다. 총 부담세액은 약 ${formatWon(
        산출세액 + 지방소득세
      )}으로 추정됩니다. (근사치, 실제 세무 자문 아님)`,
    };
  }
  if (보유기간_년 < 2) {
    const 과세표준 = Math.max(0, 양도차익 - 양도소득세_기본공제);
    const 세율 = 0.6;
    const 산출세액 = round(과세표준 * 세율);
    const 지방소득세 = round(산출세액 * 0.1);
    return {
      입력_양도차익: 양도차익,
      보유기간_년,
      보유주택수,
      일세대1주택_비과세_참고,
      적용유형: "단기보유(1~2년) 단일세율 60%",
      과세표준: round(과세표준),
      적용세율: 세율,
      양도소득세_산출세액: 산출세액,
      지방소득세: 지방소득세,
      총부담세액: 산출세액 + 지방소득세,
      설명: `보유기간 1~2년이므로 단일세율 60%가 적용됩니다. 총 부담세액은 약 ${formatWon(
        산출세액 + 지방소득세
      )}으로 추정됩니다. (근사치, 실제 세무 자문 아님)`,
    };
  }

  // 2년 이상: 장기보유특별공제 + 누진세율
  const 공제율 = 장기보유특별공제율(보유기간_년);
  const 장기보유특별공제액 = round(양도차익 * 공제율);
  const 과세표준 = Math.max(
    0,
    양도차익 - 장기보유특별공제액 - 양도소득세_기본공제
  );

  const { 세율, 누진공제, 산출세액: 산출세액_원 } = 누진세_산출세액(
    과세표준,
    종합소득세_기본세율표
  );
  const 산출세액 = round(산출세액_원);
  const 지방소득세 = round(산출세액 * 0.1);

  return {
    입력_양도차익: 양도차익,
    보유기간_년,
    보유주택수,
    일세대1주택_비과세_참고,
    적용유형: "누진세율(2년 이상 보유)",
    장기보유특별공제율: 공제율,
    장기보유특별공제액,
    과세표준: round(과세표준),
    적용세율: 세율,
    누진공제액: 누진공제,
    양도소득세_산출세액: 산출세액,
    지방소득세,
    총부담세액: 산출세액 + 지방소득세,
    설명:
      (일세대1주택_비과세_참고 ? 일세대1주택_비과세_참고 + " " : "") +
      `보유기간 ${보유기간_년}년, 장기보유특별공제율 ${(공제율 * 100).toFixed(
        0
      )}% 적용 후 과세표준은 ${formatWon(round(과세표준))}입니다. ` +
      `적용세율 ${(세율 * 100).toFixed(
        0
      )}% 기준 양도소득세는 약 ${formatWon(
        산출세액
      )}, 지방소득세 포함 총 부담세액은 약 ${formatWon(
        산출세액 + 지방소득세
      )}으로 추정됩니다(비과세가 적용되지 않는다고 가정한 참고용 계산). ` +
      `매우 단순화한 근사치이며 다주택 중과·조정대상지역 여부는 반영되지 않았습니다. 실제 신고 전 세무 전문가와 상담하십시오.`,
  };
}

// ------------------------------------------------------------------
// 5. DSR / DTI 계산기 (프리미엄)
// ------------------------------------------------------------------
// 신규 대출은 원리금균등상환 방식(PMT)으로 가정합니다.
function pmtMonthly(원금, 연이율, 만기년) {
  const r = 연이율 / 12 / 100;
  const n = 만기년 * 12;
  if (r === 0) return 원금 / n;
  const factor = Math.pow(1 + r, n);
  return (원금 * r * factor) / (factor - 1);
}

function calcDSR_DTI({
  연소득,
  기존대출_연간원리금상환액 = 0,
  기존대출_연간이자상환액 = 0,
  신규대출_원금,
  신규대출_연이율,
  신규대출_만기년,
}) {
  if (typeof 연소득 !== "number" || !isFinite(연소득) || 연소득 <= 0) {
    throw new Error("연소득은 0보다 큰 숫자여야 합니다.");
  }
  if (
    typeof 신규대출_원금 !== "number" ||
    !isFinite(신규대출_원금) ||
    신규대출_원금 <= 0
  ) {
    throw new Error("신규대출_원금은 0보다 큰 숫자여야 합니다.");
  }
  if (
    typeof 신규대출_연이율 !== "number" ||
    !isFinite(신규대출_연이율) ||
    신규대출_연이율 < 0
  ) {
    throw new Error("신규대출_연이율은 0 이상의 숫자여야 합니다.");
  }
  if (
    typeof 신규대출_만기년 !== "number" ||
    !isFinite(신규대출_만기년) ||
    신규대출_만기년 <= 0
  ) {
    throw new Error("신규대출_만기년은 0보다 큰 숫자여야 합니다.");
  }

  const 신규_월상환액 = pmtMonthly(
    신규대출_원금,
    신규대출_연이율,
    신규대출_만기년
  );
  const 신규_연간원리금 = round(신규_월상환액 * 12);
  // 신규 대출 첫해 이자 근사치(DTI 계산용): 원금 * 연이율
  const 신규_연간이자_근사 = round((신규대출_원금 * 신규대출_연이율) / 100);

  const DSR분자 = 기존대출_연간원리금상환액 + 신규_연간원리금;
  const DTI분자 = 기존대출_연간이자상환액 + 신규_연간이자_근사;

  const DSR = round((DSR분자 / 연소득) * 100, 1);
  const DTI = round((DTI분자 / 연소득) * 100, 1);

  // 흔히 쓰이는 규제 한도(스트레스 DSR 등은 반영하지 않은 일반 한도) 근사치
  const DSR한도 = 40;
  const 한도내_최대_연간원리금 = Math.max(
    0,
    (연소득 * DSR한도) / 100 - 기존대출_연간원리금상환액
  );

  return {
    입력_연소득: 연소득,
    기존대출_연간원리금상환액,
    기존대출_연간이자상환액,
    신규대출_원금,
    신규대출_연이율,
    신규대출_만기년,
    신규대출_월상환액_원리금균등: round(신규_월상환액),
    신규대출_연간원리금상환액: 신규_연간원리금,
    DSR_퍼센트: DSR,
    DTI_퍼센트: DTI,
    DSR한도_40퍼센트_기준_최대_연간원리금상환가능액: round(
      한도내_최대_연간원리금
    ),
    설명:
      `연소득 ${formatWon(연소득)} 기준, 신규 대출(원금 ${formatWon(
        신규대출_원금
      )}, 연이율 ${신규대출_연이율}%, 만기 ${신규대출_만기년}년, 원리금균등상환) ` +
      `월 상환액은 약 ${formatWon(round(신규_월상환액))}입니다. ` +
      `기존 대출을 포함한 DSR은 약 ${DSR}%, DTI는 약 ${DTI}%로 추정됩니다. ` +
      `(일반적으로 은행권 DSR 규제 한도는 40% 내외이며, 스트레스 DSR·차주 특성에 따라 실제 한도는 달라질 수 있습니다. 이 계산은 근사치입니다.)`,
  };
}

// ------------------------------------------------------------------
// 6. 환율 변환 계산기 (프리미엄)
// ------------------------------------------------------------------
// v1.1.0: 사용자가 환율을 직접 입력하면 그 값을 그대로 사용합니다(오프라인
// 폴백, 기존 동작과 동일). 환율을 입력하지 않으면 무료 무인증 공개 API인
// open.er-api.com(ExchangeRate-API의 open 엔드포인트, API 키 불필요, 매일
// 갱신)을 호출해 실시간 환율을 조회합니다. 네트워크 호출이 필요하므로
// 이 함수는 async 함수입니다.
const FX_API_BASE = "https://open.er-api.com/v6/latest/";
const FX_FETCH_TIMEOUT_MS = 8000;

// 테스트에서 실제 네트워크 호출 없이 목(mock) 응답을 주입할 수 있도록
// fetch 구현체를 모듈 내부 변수로 분리한다 (기본값은 전역 fetch).
// 환율 조회(FX API)와 프리미엄 라이선스 검증(Gumroad API) 양쪽에서 공유한다.
let _fetchImpl = typeof fetch === "function" ? fetch : undefined;

async function fetchLiveFxRate(기준통화, 대상통화) {
  if (!_fetchImpl) {
    throw new Error(
      "이 환경에서는 전역 fetch를 사용할 수 없습니다. Node.js 18 이상이 필요하거나, 환율을 직접 입력하세요."
    );
  }
  const url = `${FX_API_BASE}${encodeURIComponent(기준통화.toUpperCase())}`;
  let res;
  try {
    res = await _fetchImpl(url, {
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout
          ? AbortSignal.timeout(FX_FETCH_TIMEOUT_MS)
          : undefined,
    });
  } catch (err) {
    throw new Error(`환율 API 호출 실패(네트워크 오류): ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(`환율 API 응답 오류 (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (data.result !== "success" || !data.rates) {
    throw new Error("환율 API가 유효하지 않은 응답을 반환했습니다.");
  }
  const rate = data.rates[대상통화.toUpperCase()];
  if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) {
    throw new Error(
      `대상통화 코드 '${대상통화}'에 대한 환율을 찾을 수 없습니다. 통화 코드를 확인하세요(예: USD, KRW, JPY, EUR).`
    );
  }
  return { rate, updatedAt: data.time_last_update_utc || null };
}

async function calc환율변환({ 금액, 기준통화, 대상통화, 환율 }) {
  if (typeof 금액 !== "number" || !isFinite(금액) || 금액 < 0) {
    throw new Error("금액은 0 이상의 숫자여야 합니다.");
  }
  if (!기준통화 || !대상통화) {
    throw new Error("기준통화와 대상통화 코드를 입력해야 합니다. (예: USD, KRW)");
  }

  let 적용환율;
  let 환율출처;
  let 환율기준시각 = null;

  if (환율 !== undefined && 환율 !== null) {
    // 사용자 입력값 우선 사용 (오프라인 폴백)
    if (typeof 환율 !== "number" || !isFinite(환율) || 환율 <= 0) {
      throw new Error(
        "환율은 0보다 큰 숫자여야 합니다. (1 기준통화 = 환율 × 1 대상통화)"
      );
    }
    적용환율 = 환율;
    환율출처 = "사용자_직접입력";
  } else {
    // 실시간 공개 API 조회 (open.er-api.com, API 키 불필요)
    const live = await fetchLiveFxRate(기준통화, 대상통화);
    적용환율 = live.rate;
    환율출처 = "실시간_API(open.er-api.com)";
    환율기준시각 = live.updatedAt;
  }

  const 변환금액 = round(금액 * 적용환율, 2);

  return {
    입력_금액: 금액,
    기준통화,
    대상통화,
    적용환율: 적용환율,
    환율출처,
    환율기준시각,
    변환금액,
    설명:
      `${금액.toLocaleString("ko-KR")} ${기준통화}를 1 ${기준통화} = ${적용환율} ${대상통화} 환율로 환산하면 ` +
      `${변환금액.toLocaleString("ko-KR")} ${대상통화}입니다. ` +
      (환율출처 === "사용자_직접입력"
        ? "(사용자가 직접 입력한 환율값을 사용했습니다.)"
        : `(실시간 공개 환율 API(open.er-api.com)로 조회한 환율입니다. 기준시각: ${
            환율기준시각 || "확인불가"
          }. 실제 은행/증권사 고시환율과는 스프레드 차이가 있을 수 있습니다.)`),
  };
}

// ------------------------------------------------------------------
// 7. 청약 가점 계산기 (프리미엄)
// ------------------------------------------------------------------
// 주택청약 가점제(85㎡ 이하 등 가점제 적용 물량 기준) 3개 항목 합산.
// 무주택기간(32점 만점) + 부양가족수(35점 만점) + 청약통장 가입기간(17점 만점)
// = 최대 84점. 무주택기간 기산일 예외(만 30세/혼인신고일 등), 부양가족 인정
// 범위(동거 요건 등) 같은 세부 규정은 반영하지 않은 표준 가점 산정표 근사치
// 입니다. 실제 청약 신청 전 청약홈(applyhome.co.kr) 공식 계산기로 재확인하십시오.
function 무주택기간_점수(무주택기간_년) {
  if (무주택기간_년 < 1) return 2;
  const capped = Math.min(무주택기간_년, 15);
  return Math.min(32, 2 + Math.floor(capped) * 2);
}

function 부양가족_점수(부양가족수) {
  const capped = Math.min(부양가족수, 6);
  return Math.min(35, 5 + capped * 5);
}

function 청약통장가입기간_점수(가입기간_년) {
  if (가입기간_년 < 0.5) return 1;
  if (가입기간_년 < 1) return 2;
  const capped = Math.min(가입기간_년, 15);
  return Math.min(17, Math.floor(capped) + 2);
}

function calc청약가점({ 무주택기간_년, 부양가족수, 청약통장가입기간_년 }) {
  if (
    typeof 무주택기간_년 !== "number" ||
    !isFinite(무주택기간_년) ||
    무주택기간_년 < 0
  ) {
    throw new Error("무주택기간_년은 0 이상의 숫자여야 합니다.");
  }
  if (
    typeof 부양가족수 !== "number" ||
    !isFinite(부양가족수) ||
    부양가족수 < 0 ||
    !Number.isInteger(부양가족수)
  ) {
    throw new Error("부양가족수는 0 이상의 정수여야 합니다. (본인 제외 세대원 수)");
  }
  if (
    typeof 청약통장가입기간_년 !== "number" ||
    !isFinite(청약통장가입기간_년) ||
    청약통장가입기간_년 < 0
  ) {
    throw new Error("청약통장가입기간_년은 0 이상의 숫자여야 합니다.");
  }

  const 무주택점수 = 무주택기간_점수(무주택기간_년);
  const 부양가족점수 = 부양가족_점수(부양가족수);
  const 가입기간점수 = 청약통장가입기간_점수(청약통장가입기간_년);
  const 총점 = 무주택점수 + 부양가족점수 + 가입기간점수;

  return {
    입력_무주택기간_년: 무주택기간_년,
    입력_부양가족수: 부양가족수,
    입력_청약통장가입기간_년: 청약통장가입기간_년,
    무주택기간_점수: 무주택점수,
    무주택기간_배점상한: 32,
    부양가족_점수: 부양가족점수,
    부양가족_배점상한: 35,
    청약통장가입기간_점수: 가입기간점수,
    청약통장가입기간_배점상한: 17,
    총점,
    총점_만점: 84,
    설명:
      `무주택기간 ${무주택기간_년}년(${무주택점수}/32점), 부양가족 ${부양가족수}명(${부양가족점수}/35점), ` +
      `청약통장 가입기간 ${청약통장가입기간_년}년(${가입기간점수}/17점)을 합산한 청약 가점은 총 ${총점}점 ` +
      `(84점 만점)입니다. (표준 가점 산정표 근사치이며, 무주택기간 기산일 예외·부양가족 인정 요건 등 세부 규정은 반영되지 않았습니다. 실제 청약 신청 전 청약홈(applyhome.co.kr) 공식 계산기로 반드시 재확인하십시오.)`,
  };
}

// ------------------------------------------------------------------
// 프리미엄 라이선스 검증 (v1.1.0 — Gumroad License Verification API 실시간 조회)
// ------------------------------------------------------------------
// v1.0.0의 문제점: 로컬 HMAC-SHA256 체크섬 방식은 이 소스 코드 자체가
// npm/GitHub에 공개 배포되므로, `generateLicenseKey()`와 그 비밀키가
// 그대로 노출되어 **누구나 이 함수를 실행해 스스로 유효한 프리미엄 키를
// 만들어낼 수 있었다.** 오프라인 코드에 비밀키를 심는 방식 자체의
// 근본적 한계였다.
//
// v1.1.0 해결책: 검증을 "우리 코드"가 아니라 **Gumroad 서버**에서 하도록
// 전환했다. Gumroad License Verification API
// (`POST https://api.gumroad.com/v2/licenses/verify`, 파라미터:
// `product_permalink` + `license_key`, API 키 불필요·공개 엔드포인트)는
// 실제로 그 상품을 결제하고 Gumroad가 발급한 키만 유효하다고 응답한다.
// 이 검증 로직은 소스코드를 통째로 공개해도 안전하다 — 검증 판단이
// 서버(Gumroad) 쪽에서 이뤄지고, 로컬에는 재현 가능한 비밀 로직이 전혀
// 없기 때문이다(체크섬을 스스로 계산해 키를 위조하는 것이 원천적으로 불가능).
//
// 설계 원칙(fail-closed):
//   1. `GUMROAD_PRODUCT_PERMALINK` 환경변수가 없으면 — 아직 Gumroad 상품이
//      만들어지지 않은 상태이므로 "프리미엄 상품 준비 중" 메시지로 안전하게
//      막는다(라이선스 키가 있어도 통과시키지 않음).
//   2. 라이선스 키가 없으면 즉시 실패.
//   3. Gumroad API 네트워크 호출이 실패/타임아웃 되어도 반드시 실패 처리한다
//      (라이선스를 통과시키지 않음 — 네트워크 장애를 "우회 성공"으로 오인하는
//      취약점을 막기 위함).
//   4. Gumroad가 "유효"라고 응답해도 환불(refunded)/이의제기(chargebacked/
//      disputed)/구독취소(subscription_cancelled_at) 상태면 실패 처리한다.
//
// 한계: 이 방식은 tool 호출마다(또는 최소 세션당 1회) 네트워크 호출이
// 필요해 완전 오프라인 stdio 서버 철학과는 다소 배치된다. 하지만 "위조
// 불가능한 검증"이라는 더 중요한 속성을 얻는 트레이드오프다.
const GUMROAD_VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";
const LICENSE_FETCH_TIMEOUT_MS = 8000;

const PREMIUM_NOT_CONFIGURED_MESSAGE =
  "프리미엄 상품 준비 중입니다. 이 도구(양도소득세 간이계산/DSR·DTI/환율변환/청약가점)는 " +
  "현재 Gumroad 프리미엄 상품이 아직 개설되지 않아 이용할 수 없습니다. " +
  "(서버 운영자가 GUMROAD_PRODUCT_PERMALINK 환경변수를 설정하면 활성화됩니다.)";

const PREMIUM_PURCHASE_MESSAGE =
  "프리미엄 라이선스가 필요합니다. 이 도구(양도소득세 간이계산/DSR·DTI/환율변환/청약가점)는 " +
  "프리미엄 구독 전용입니다. Gumroad에서 라이선스를 구매한 뒤 발급받은 키를 " +
  "KR_FINANCE_LICENSE_KEY 환경변수에 설정하세요. 라이선스 유효성은 매 호출 시 " +
  "Gumroad 서버에서 실시간으로 확인합니다.";

const PREMIUM_NETWORK_ERROR_MESSAGE =
  "라이선스 서버(Gumroad) 확인에 실패했습니다(네트워크 오류 또는 타임아웃). " +
  "안전을 위해 이 경우 프리미엄 기능을 차단합니다. 잠시 후 다시 시도해 주세요.";

const PREMIUM_REVOKED_MESSAGE =
  "이 라이선스는 환불/이의제기/구독취소 처리되어 더 이상 유효하지 않습니다. " +
  PREMIUM_PURCHASE_MESSAGE;

/**
 * Gumroad License Verification API를 호출해 라이선스 키의 유효성을 확인한다.
 * @param {string} productPermalink - Gumroad 상품 permalink (예: kr-finance-mcp-premium)
 * @param {string} licenseKey - 검증할 라이선스 키
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
async function verifyGumroadLicense(productPermalink, licenseKey) {
  if (!_fetchImpl) {
    return {
      ok: false,
      message:
        "이 환경에서는 전역 fetch를 사용할 수 없어 라이선스를 검증할 수 없습니다. Node.js 18 이상이 필요합니다.",
    };
  }
  let res;
  try {
    res = await _fetchImpl(GUMROAD_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_permalink: productPermalink,
        license_key: licenseKey,
      }).toString(),
      signal:
        typeof AbortSignal !== "undefined" && AbortSignal.timeout
          ? AbortSignal.timeout(LICENSE_FETCH_TIMEOUT_MS)
          : undefined,
    });
  } catch (err) {
    // fail-closed: 네트워크 오류/타임아웃 시 반드시 실패 처리
    return { ok: false, message: PREMIUM_NETWORK_ERROR_MESSAGE };
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    return { ok: false, message: PREMIUM_NETWORK_ERROR_MESSAGE };
  }

  // Gumroad는 유효하지 않은 키에 대해 HTTP 404 + { success: false } 를 반환한다.
  if (!data || data.success !== true) {
    return { ok: false, message: PREMIUM_PURCHASE_MESSAGE };
  }

  const purchase = data.purchase || {};
  if (purchase.refunded || purchase.chargebacked || purchase.disputed) {
    return { ok: false, message: PREMIUM_REVOKED_MESSAGE };
  }
  if (purchase.subscription_cancelled_at || purchase.subscription_failed_at) {
    return { ok: false, message: PREMIUM_REVOKED_MESSAGE };
  }

  return { ok: true };
}

/**
 * 프리미엄 도구 실행 전 게이트. fail-closed 원칙:
 *   - GUMROAD_PRODUCT_PERMALINK 미설정 → 차단("준비 중")
 *   - KR_FINANCE_LICENSE_KEY 미설정 → 차단("구매 필요")
 *   - Gumroad API 호출 실패/타임아웃 → 차단(네트워크 오류)
 *   - Gumroad가 무효/환불/취소로 응답 → 차단
 *   - 위 모든 조건을 통과해야만 → 허용
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
async function requirePremiumLicense() {
  const productPermalink = process.env.GUMROAD_PRODUCT_PERMALINK;
  if (!productPermalink) {
    return { ok: false, message: PREMIUM_NOT_CONFIGURED_MESSAGE };
  }
  const key = process.env.KR_FINANCE_LICENSE_KEY;
  if (!key || typeof key !== "string" || key.trim() === "") {
    return { ok: false, message: PREMIUM_PURCHASE_MESSAGE };
  }
  return verifyGumroadLicense(productPermalink, key.trim());
}

module.exports = {
  calc4대보험,
  calc연봉실수령액,
  calc퇴직금,
  calc양도소득세_간이,
  calcDSR_DTI,
  calc환율변환,
  calc청약가점,
  requirePremiumLicense,
  verifyGumroadLicense,
  PREMIUM_PURCHASE_MESSAGE,
  PREMIUM_NOT_CONFIGURED_MESSAGE,
  PREMIUM_NETWORK_ERROR_MESSAGE,
  PREMIUM_REVOKED_MESSAGE,
  // 테스트 및 내부용 유틸 노출
  _internal: {
    round,
    formatWon,
    근로소득공제,
    근로소득세액공제_한도,
    누진세_산출세액,
    pmtMonthly,
    무주택기간_점수,
    부양가족_점수,
    청약통장가입기간_점수,
    // 테스트에서 실제 네트워크 호출 없이 목(mock) fetch를 주입하기 위한 훅.
    // 프로덕션 코드에서는 사용하지 않는다.
    setFetchForTesting(fn) {
      _fetchImpl = fn;
    },
    restoreFetch() {
      _fetchImpl = typeof fetch === "function" ? fetch : undefined;
    },
  },
};
