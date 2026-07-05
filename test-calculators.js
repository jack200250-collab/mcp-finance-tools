"use strict";
/**
 * test-calculators.js
 * -----------------------------------------------------------------------
 * MCP 프로토콜을 거치지 않고 calculators.js의 순수 함수들을 직접 호출해
 * 샘플 입력 -> 출력이 상식적인 범위인지 눈으로 확인하기 위한 스모크
 * 테스트 스크립트. (자동 assert 일부 + 콘솔 출력)
 *
 * v1.1.0: 라이선스 검증이 Gumroad 실시간 API 호출 방식으로 바뀌면서
 * requirePremiumLicense()가 async 함수가 되었다. 이 테스트는 실제
 * 네트워크 호출을 하지 않고 calc._internal.setFetchForTesting()으로
 * fetch를 목(mock) 처리해 검증한다.
 *
 * 실행: node test-calculators.js
 * -----------------------------------------------------------------------
 */

const calc = require("./calculators.js");

let failed = 0;

function check(label, condition, detail) {
  const mark = condition ? "PASS" : "FAIL";
  if (!condition) failed++;
  console.log(`[${mark}] ${label}${detail ? " - " + detail : ""}`);
}

function section(title) {
  console.log("\n" + "=".repeat(70));
  console.log(title);
  console.log("=".repeat(70));
}

async function main() {
  // ------------------------------------------------------------------
  // 1. 4대보험 계산기 - 월급 300만원 (일반 구간)
  // ------------------------------------------------------------------
  section("1. calc_4대보험 (월급 3,000,000원)");
  const r1 = calc.calc4대보험({ 월급: 3_000_000 });
  console.log(r1);
  check(
    "공제합계가 월급의 5~10% 범위 (상식적 범위)",
    r1.공제합계 > 3_000_000 * 0.05 && r1.공제합계 < 3_000_000 * 0.1,
    `공제합계=${r1.공제합계}`
  );
  check("세후 월급이 원래 월급보다 작음", r1.세후_월급_4대보험만공제 < 3_000_000);
  check(
    "국민연금 기준소득월액 상한/하한 미적용(일반 구간)",
    r1.국민연금_상한적용 === false && r1.국민연금_하한적용 === false
  );

  section("1-1. calc_4대보험 (월급 8,000,000원, 국민연금 상한액 적용 확인)");
  const r1b = calc.calc4대보험({ 월급: 8_000_000 });
  console.log(r1b);
  check(
    "월급이 기준소득월액 상한(6,590,000원)을 넘으면 상한적용=true",
    r1b.국민연금_상한적용 === true
  );
  check(
    "국민연금이 상한액(6,590,000원) 기준으로 계산됨(월급 전체 기준이 아님)",
    r1b.국민연금_기준소득월액 === 6_590_000 && r1b.국민연금 < 8_000_000 * 0.0475
  );

  section("1-2. calc_4대보험 (월급 300,000원, 국민연금 하한액 적용 확인)");
  const r1c = calc.calc4대보험({ 월급: 300_000 });
  console.log(r1c);
  check(
    "월급이 기준소득월액 하한(410,000원) 미만이면 하한적용=true",
    r1c.국민연금_하한적용 === true
  );
  check(
    "국민연금이 하한액(410,000원) 기준으로 계산됨(실제 월급보다 큰 기준소득월액)",
    r1c.국민연금_기준소득월액 === 410_000
  );

  // ------------------------------------------------------------------
  // 2. 연봉 실수령액 계산기 - 연봉 4,000만원
  // ------------------------------------------------------------------
  section("2. calc_연봉실수령액 (연봉 40,000,000원)");
  const r2 = calc.calc연봉실수령액({ 연봉: 40_000_000 });
  console.log(r2);
  check(
    "연 실수령액이 3,000만원대 (상식적 범위: 3,200만~3,700만)",
    r2.연_실수령액_근사치 >= 32_000_000 && r2.연_실수령액_근사치 <= 37_000_000,
    `연실수령액=${r2.연_실수령액_근사치}`
  );
  check(
    "월 실수령액이 연 실수령액의 1/12과 근접",
    Math.abs(r2.월_실수령액_근사치 * 12 - r2.연_실수령액_근사치) < 10
  );
  check(
    "과세근거에 근로소득공제/과세표준/결정세액 필드가 포함됨(투명성)",
    typeof r2.과세근거.근로소득공제액 === "number" &&
      typeof r2.과세근거.과세표준 === "number" &&
      typeof r2.과세근거.결정세액_연간 === "number"
  );

  section("2-1. calc_연봉실수령액 (연봉 60,000,000원, 참고용)");
  const r2b = calc.calc연봉실수령액({ 연봉: 60_000_000 });
  console.log(r2b);
  check(
    "연봉 6천만원 실수령액이 연봉보다 작고 4천만원대 이상",
    r2b.연_실수령액_근사치 < 60_000_000 && r2b.연_실수령액_근사치 > 45_000_000
  );

  section("2-2. calc_연봉실수령액 (연봉 200,000,000원, 고소득 구간 - 실효세율 상승 확인)");
  const r2c = calc.calc연봉실수령액({ 연봉: 200_000_000 });
  console.log(r2c);
  const 실효세율_2c =
    (r2.입력_연봉 - r2.연_실수령액_근사치) / r2.입력_연봉;
  const 실효세율_2b =
    (r2b.입력_연봉 - r2b.연_실수령액_근사치) / r2b.입력_연봉;
  const 실효세율_2c_high =
    (r2c.입력_연봉 - r2c.연_실수령액_근사치) / r2c.입력_연봉;
  check(
    "누진 구조상 고소득일수록 실효세율(연봉 대비 공제 비율)이 높아짐",
    실효세율_2c_high > 실효세율_2b && 실효세율_2b > 실효세율_2c,
    `연4천만=${(실효세율_2c * 100).toFixed(1)}% 연6천만=${(
      실효세율_2b * 100
    ).toFixed(1)}% 연2억=${(실효세율_2c_high * 100).toFixed(1)}%`
  );

  // ------------------------------------------------------------------
  // 3. 퇴직금 계산기 - 근속 3년, 최근 3개월 급여합계 900만원(월 300만원 x 3)
  // ------------------------------------------------------------------
  section("3. calc_퇴직금 (근속 3년, 최근3개월 급여합계 9,000,000원)");
  const r3 = calc.calc퇴직금({ 근속연수: 3, 최근3개월_급여합계: 9_000_000 });
  console.log(r3);
  check(
    "3년 근속 예상 퇴직금이 대략 월급 3개월치 근처(약 900만원 안팎)",
    r3.예상_퇴직금 > 8_000_000 && r3.예상_퇴직금 < 10_000_000,
    `예상퇴직금=${r3.예상_퇴직금}`
  );

  // ------------------------------------------------------------------
  // 4. 프리미엄 라이선스 게이트 - Gumroad API 실시간 검증 (목 fetch 사용,
  //    실제 네트워크 호출 없음)
  // ------------------------------------------------------------------
  section("4. 프리미엄 게이트 - GUMROAD_PRODUCT_PERMALINK 미설정 (fail-closed)");
  delete process.env.GUMROAD_PRODUCT_PERMALINK;
  delete process.env.KR_FINANCE_LICENSE_KEY;
  const gate1 = await calc.requirePremiumLicense();
  console.log(gate1);
  check(
    "상품 permalink 미설정 시 '준비 중' 메시지로 안전하게 막힘 (ok=false)",
    gate1.ok === false && gate1.message === calc.PREMIUM_NOT_CONFIGURED_MESSAGE
  );

  section("4-1. 프리미엄 게이트 - permalink는 있지만 라이선스 키 없음");
  process.env.GUMROAD_PRODUCT_PERMALINK = "kr-finance-mcp-premium";
  const gate2 = await calc.requirePremiumLicense();
  console.log(gate2);
  check("라이선스 키가 없으면 막힘 (ok=false, 네트워크 호출 없이 즉시 실패)", gate2.ok === false);

  section("4-2. 프리미엄 게이트 - 목(mock) Gumroad API가 유효한 라이선스로 응답");
  process.env.KR_FINANCE_LICENSE_KEY = "MOCK-VALID-KEY";
  calc._internal.setFetchForTesting(async (url, opts) => {
    check(
      "Gumroad 검증 URL로 POST 요청을 보냄",
      url === "https://api.gumroad.com/v2/licenses/verify" && opts.method === "POST"
    );
    return {
      ok: true,
      json: async () => ({ success: true, purchase: { refunded: false } }),
    };
  });
  const gate3 = await calc.requirePremiumLicense();
  console.log(gate3);
  check("Gumroad가 success:true로 응답하면 통과 (ok=true)", gate3.ok === true);

  section("4-3. 프리미엄 게이트 - 목 Gumroad API가 무효 키(success:false)로 응답");
  calc._internal.setFetchForTesting(async () => ({
    ok: true,
    json: async () => ({ success: false }),
  }));
  const gate4 = await calc.requirePremiumLicense();
  check("success:false 응답이면 거부됨 (ok=false)", gate4.ok === false);

  section("4-4. 프리미엄 게이트 - 목 Gumroad API가 환불된 구매로 응답");
  calc._internal.setFetchForTesting(async () => ({
    ok: true,
    json: async () => ({ success: true, purchase: { refunded: true } }),
  }));
  const gate5 = await calc.requirePremiumLicense();
  console.log(gate5);
  check("환불된 구매(refunded:true)는 거부됨 (ok=false)", gate5.ok === false);

  section("4-5. 프리미엄 게이트 - 목 fetch가 네트워크 오류로 실패 (fail-closed 확인)");
  calc._internal.setFetchForTesting(async () => {
    throw new Error("ECONNRESET (시뮬레이션)");
  });
  const gate6 = await calc.requirePremiumLicense();
  console.log(gate6);
  check(
    "네트워크 오류 시 통과시키지 않고 반드시 실패 처리됨 (fail-closed, ok=false)",
    gate6.ok === false
  );

  // 이후 계산 테스트에서는 실제 프리미엄 게이트를 다시 통과시켜 계산 로직만 검증
  calc._internal.setFetchForTesting(async () => ({
    ok: true,
    json: async () => ({ success: true, purchase: {} }),
  }));
  const gateOk = await calc.requirePremiumLicense();
  check("이후 계산 테스트를 위해 목 fetch로 게이트 통과 재확인", gateOk.ok === true);

  // ------------------------------------------------------------------
  // 4b. 양도소득세 간이 계산기 (프리미엄 계산 로직 자체 검증)
  // ------------------------------------------------------------------
  section("4b. calc_양도소득세_간이 (양도차익 1억, 보유 4년, 1주택 - 비과세 경고 확인)");
  const r4 = calc.calc양도소득세_간이({
    양도차익: 100_000_000,
    보유기간_년: 4,
    보유주택수: 1,
  });
  console.log(r4);
  check("과세표준이 양도차익보다 작음 (공제 반영됨)", r4.과세표준 < 100_000_000);
  check(
    "총부담세액이 양도차익보다 작음 (상식적 범위)",
    r4.총부담세액 < 100_000_000 && r4.총부담세액 > 0,
    `총부담세액=${r4.총부담세액}`
  );
  check(
    "1주택+2년 이상 보유 시 비과세 가능성 경고가 표시됨",
    typeof r4.일세대1주택_비과세_참고 === "string" && r4.일세대1주택_비과세_참고.includes("비과세")
  );

  section("4b-1. calc_양도소득세_간이 (다주택자는 비과세 경고 없음)");
  const r4c = calc.calc양도소득세_간이({
    양도차익: 100_000_000,
    보유기간_년: 4,
    보유주택수: 2,
  });
  check("보유주택수 2채면 비과세 참고 필드가 null", r4c.일세대1주택_비과세_참고 === null);

  section("4b-2. calc_양도소득세_간이 (단기보유 6개월, 단일세율 70% 확인)");
  const r4b = calc.calc양도소득세_간이({ 양도차익: 50_000_000, 보유기간_년: 0.5 });
  console.log(r4b);
  check("단기보유 세율이 70%로 적용됨", r4b.적용세율 === 0.7);

  // ------------------------------------------------------------------
  // 5. DSR/DTI 계산기 - 연소득 6천만원, 신규대출 3억, 금리 4%, 30년
  // ------------------------------------------------------------------
  section("5. calc_DSR_DTI (연소득 60,000,000원, 신규대출 300,000,000원/4%/30년)");
  const r5 = calc.calcDSR_DTI({
    연소득: 60_000_000,
    기존대출_연간원리금상환액: 0,
    기존대출_연간이자상환액: 0,
    신규대출_원금: 300_000_000,
    신규대출_연이율: 4,
    신규대출_만기년: 30,
  });
  console.log(r5);
  check(
    "DSR이 0~100% 범위의 상식적인 값",
    r5.DSR_퍼센트 > 0 && r5.DSR_퍼센트 < 100,
    `DSR=${r5.DSR_퍼센트}%`
  );
  check(
    "신규대출 월상환액이 대출원금 대비 합리적 범위(약 100만원~200만원)",
    r5.신규대출_월상환액_원리금균등 > 1_000_000 && r5.신규대출_월상환액_원리금균등 < 2_000_000,
    `월상환액=${r5.신규대출_월상환액_원리금균등}`
  );

  // ------------------------------------------------------------------
  // 6. 환율 변환 계산기
  // ------------------------------------------------------------------
  section("6. calc_환율변환 (1000 USD -> KRW, 환율 직접입력 1,380 - 오프라인 폴백)");
  const r6 = await calc.calc환율변환({
    금액: 1000,
    기준통화: "USD",
    대상통화: "KRW",
    환율: 1380,
  });
  console.log(r6);
  check("1000 USD * 1380 = 1,380,000 KRW 정확히 일치", r6.변환금액 === 1_380_000);
  check("환율출처가 '사용자_직접입력'으로 기록됨", r6.환율출처 === "사용자_직접입력");

  section("6-1. calc_환율변환 (환율 미입력 - 목 실시간 API 응답 사용)");
  calc._internal.setFetchForTesting(async (url) => {
    check(
      "환율 미입력 시 open.er-api.com으로 실시간 조회를 시도함",
      url === "https://open.er-api.com/v6/latest/USD"
    );
    return {
      ok: true,
      json: async () => ({
        result: "success",
        time_last_update_utc: "Sun, 05 Jul 2026 00:00:00 +0000",
        rates: { KRW: 1400 },
      }),
    };
  });
  const r6b = await calc.calc환율변환({ 금액: 1000, 기준통화: "USD", 대상통화: "KRW" });
  console.log(r6b);
  check(
    "실시간 API 조회 결과(1400)가 적용됨",
    r6b.적용환율 === 1400 && r6b.변환금액 === 1_400_000
  );
  check("환율출처가 실시간 API로 기록됨", r6b.환율출처.includes("실시간_API"));

  section("6-2. calc_환율변환 (환율 미입력 + 목 API 실패 - 반드시 오류로 처리)");
  calc._internal.setFetchForTesting(async () => {
    throw new Error("네트워크 오류 시뮬레이션");
  });
  let r6c_threw = false;
  try {
    await calc.calc환율변환({ 금액: 1000, 기준통화: "USD", 대상통화: "KRW" });
  } catch (err) {
    r6c_threw = true;
  }
  check("환율 미입력 + API 실패 시 계산을 강행하지 않고 오류를 던짐", r6c_threw === true);

  calc._internal.restoreFetch();

  // ------------------------------------------------------------------
  // 7. 청약 가점 계산기 - 무주택 8년, 부양가족 2명, 청약통장 가입 10년
  // ------------------------------------------------------------------
  section("7. calc_청약가점 (무주택 8년 / 부양가족 2명 / 청약통장 10년)");
  const r7 = calc.calc청약가점({
    무주택기간_년: 8,
    부양가족수: 2,
    청약통장가입기간_년: 10,
  });
  console.log(r7);
  check("무주택기간 8년 -> 18점 (2 + 8*2)", r7.무주택기간_점수 === 18);
  check("부양가족 2명 -> 15점 (5 + 2*5)", r7.부양가족_점수 === 15);
  check("청약통장 가입 10년 -> 12점 (10 + 2)", r7.청약통장가입기간_점수 === 12);
  check(
    "총점 = 18 + 15 + 12 = 45점, 84점 만점 이하",
    r7.총점 === 45 && r7.총점 <= 84,
    `총점=${r7.총점}`
  );

  section("7-1. calc_청약가점 (만점 근처: 무주택 20년/부양가족 8명/가입 20년)");
  const r7b = calc.calc청약가점({
    무주택기간_년: 20,
    부양가족수: 8,
    청약통장가입기간_년: 20,
  });
  console.log(r7b);
  check("무주택기간 상한 32점 적용", r7b.무주택기간_점수 === 32);
  check("부양가족 상한 35점 적용", r7b.부양가족_점수 === 35);
  check("청약통장 상한 17점 적용", r7b.청약통장가입기간_점수 === 17);
  check("총점이 만점 84점을 넘지 않음", r7b.총점 === 84);

  section("7-2. calc_청약가점 (프리미엄 게이트 미설정 상태 재확인)");
  delete process.env.GUMROAD_PRODUCT_PERMALINK;
  delete process.env.KR_FINANCE_LICENSE_KEY;
  const gate7 = await calc.requirePremiumLicense();
  check("permalink/키 삭제 후 다시 게이트가 막힘 (ok=false)", gate7.ok === false);

  // ------------------------------------------------------------------
  // 결과 요약
  // ------------------------------------------------------------------
  section("테스트 요약");
  if (failed === 0) {
    console.log("모든 체크 통과.");
  } else {
    console.log(`${failed}개 체크 실패.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("테스트 실행 중 예외 발생:", err);
  process.exitCode = 1;
});
