# 배포 실행 단계 (사용자 직접 실행용)

작성일: 2026-07-04

**중요**: 아래 명령어들은 에이전트가 절대 대신 실행하지 않는다 — GitHub 계정 인증, npm 계정 로그인, 각 마켓플레이스 계정 가입이 필요한 작업이기 때문이다. 로컬 준비(코드 작성, `git init`, 로컬 커밋, `npm pack --dry-run` 검증)까지는 이미 완료되어 있다. 아래를 사용자가 순서대로 직접 실행하면 된다.

작업 폴더: `C:\Users\eady2\OneDrive\Desktop\revenue-system\mcp-finance-tools\`

---

## 0. 현재까지 완료된 상태 (에이전트가 이미 처리함)

- [x] `git init` 완료, `.gitignore`(node_modules 등 제외) 작성 완료.
- [x] 로컬 커밋 완료 (`git log`로 확인 가능).
- [x] `npm pack --dry-run`으로 패키징 정상 확인 (6개 파일, ~18KB tarball).
- [x] `npm view mcp-finance-tools` 조회 결과 404 — 이 이름으로 npm에 공개 배포된 패키지가 아직 없음(사용 가능한 이름).
- [x] 7개 계산기 도구(무료 3종 + 프리미엄 4종) + `test-calculators.js` 전체 PASS.

---

## 1. GitHub 공개 저장소 생성 + push

### 1-1. GitHub 웹사이트에서 새 저장소 생성 (브라우저에서 직접)

1. https://github.com/new 접속 (로그인 상태여야 함).
2. Repository name: `mcp-finance-tools`
3. Description: `Korea-specific financial calculator MCP server (4대보험/연봉실수령액/퇴직금/양도소득세/DSR·DTI/환율변환/청약가점)`
4. Public 선택 (마켓플레이스 등록을 위해 공개 저장소여야 함).
5. **"Add a README file", "Add .gitignore", "Choose a license" 체크박스는 모두 비워둘 것** — 이미 로컬에 해당 파일들이 있으므로 체크하면 충돌 발생.
6. "Create repository" 클릭.

### 1-2. 로컬 저장소를 원격에 연결 후 push (터미널에서 직접 실행)

```bash
cd "C:\Users\eady2\OneDrive\Desktop\revenue-system\mcp-finance-tools"
git remote add origin https://github.com/<본인_GitHub_계정>/mcp-finance-tools.git
git branch -M main
git push -u origin main
```

- `<본인_GitHub_계정>` 부분을 실제 GitHub 사용자명으로 교체.
- push 시 GitHub 로그인 인증(브라우저 팝업 또는 Personal Access Token)이 필요할 수 있음.

### 1-3. (선택) README에 뱃지 추가

push 완료 후 README.md 상단에 아래 같은 뱃지를 추가하면 신뢰도가 올라감 (직접 편집 또는 다음 에이전트 실행 때 요청):

```markdown
![npm version](https://img.shields.io/npm/v/mcp-finance-tools)
![license](https://img.shields.io/npm/l/mcp-finance-tools)
```

---

## 2. npm 공개 배포

### 2-1. npm 계정 로그인 (터미널에서 직접)

```bash
npm login
```
- 브라우저가 열리며 npm 계정으로 로그인/2FA 인증 진행.
- 계정이 없다면 https://www.npmjs.com/signup 에서 먼저 가입.

### 2-2. 최종 확인 후 배포

```bash
cd "C:\Users\eady2\OneDrive\Desktop\revenue-system\mcp-finance-tools"
npm pack --dry-run   # 배포 전 마지막으로 패키지 내용물 재확인 (선택)
npm publish --access public
```

- `--access public`은 스코프가 없는 패키지(`mcp-finance-tools`)에는 사실 기본값이지만, 혹시 나중에 `@계정명/mcp-finance-tools` 같은 스코프 이름으로 바꾸는 경우를 대비해 명시.
- 배포 성공 시 `https://www.npmjs.com/package/mcp-finance-tools` 에서 확인 가능.
- 이후 `npx -y mcp-finance-tools`가 실제로 전 세계 어디서나 동작하게 됨.

### 2-3. 버전 업데이트가 필요할 때 (참고, 지금 당장 할 일 아님)

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm publish
```

---

## 3. Smithery / Glama / MCP.so 등록

`marketplace-metadata.md`에 각 플랫폼별로 붙여넣을 텍스트를 미리 정리해 두었다. GitHub push + npm publish가 먼저 완료된 뒤 아래 순서로 진행.

1. **Smithery**: https://smithery.ai 가입 → "Add Server" 또는 "Submit" → GitHub 저장소 URL 입력 → `marketplace-metadata.md` §1 내용 붙여넣기.
2. **Glama**: https://glama.ai/mcp/servers 가입 → 저장소 제출 → `marketplace-metadata.md` §2 내용 참고.
3. **MCP.so**: https://mcp.so 접속 → 제출 폼 작성 → `marketplace-metadata.md` §3 내용 참고.

---

## 4. Gumroad 프리미엄 라이선스 상품 개설 (선택, 수익화 핵심)

1. https://gumroad.com 가입/로그인.
2. 새 상품 생성 → 유형: "Digital product" 또는 "Subscription"(월 9,900원 구독 원하면 Membership 상품으로).
3. 상품 설정에서 **"Generate a unique license key per sale"** 옵션 활성화 (Gumroad가 자동으로 라이선스 키를 만들어 구매 확인 이메일에 포함시켜줌 — 별도 백엔드 코드 불필요).
4. 상품 설명에 `monetization-plan.md` §2(타겟 고객), §4(가격 구조) 내용을 참고해 판매 페이지 문구 작성.
5. 다만 현재 MCP 서버의 라이선스 검증(`calculators.js`)은 Gumroad가 발급하는 키 형식과 다른 **자체 HMAC 체크섬 형식**(`KRFIN-XXXX-YYYY-ZZZZ`)을 사용한다. 두 가지 중 택1:
   - **(A) 간단한 방법**: Gumroad 라이선스 키 발급은 끄고, 대신 `generateLicenseKey()`로 직접 키를 만들어 구매자에게 수동으로(또는 Zapier 자동화로) 이메일 전달. 초기 구매자가 적을 때 적합.
   - **(B) 정식 방법**: `monetization-plan.md` §8-2 Option A/B 설계대로 별도 검증 로직 또는 서버리스 함수 구축 — 규모가 커지면 필요.

---

## 5. 체크리스트 요약

- [ ] GitHub 저장소 생성 (Public, README/.gitignore/license 체크 해제)
- [ ] `git remote add origin ...` + `git push -u origin main`
- [ ] `npm login`
- [ ] `npm publish --access public`
- [ ] Smithery 가입 + 등록
- [ ] Glama 가입 + 등록
- [ ] MCP.so 가입 + 등록
- [ ] Gumroad 상품 개설 (라이선스 키 발급 방식 A/B 중 택1)
