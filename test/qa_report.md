# QA 검증 보고서

**프로젝트**: AI 스마트 로드맵 엔진 (스마트 아이디어 발전소 & 액션 플래너)
**검증일**: 2026-05-25
**검증자**: QA Engineer
**검증 대상 파일**:
- `index.html` (메인 앱 — MatrixEngine 인라인 포함, 앱 로직 전체)
- `skills/matrixEngine.js` (로컬 알고리즘 로드맵 생성 엔진)

---

## 검증 범위

| TC ID | 검증 항목 | 검증 방법 |
|-------|-----------|-----------|
| TC-01 | 빈 제목 제출 차단 및 오류 UI 표시 | 정적 코드 분석 |
| TC-02 | LocalStorage 비어있을 때 빈 상태 UI 렌더링 | 정적 코드 분석 |
| TC-03 | 존재하지 않는 카테고리 Fallback 및 화이트리스트 검증 | 정적 코드 분석 + 코드 수정 |

---

## 테스트 결과 요약

| 카테고리 | 통과 | 실패(수정 완료) | 미테스트 |
|---------|------|------|--------|
| 입력 유효성 검사 | 1 | 0 | 0 |
| LocalStorage 처리 | 1 | 0 | 0 |
| 카테고리 Fallback / 화이트리스트 | 0 | 1 (FIXED) | 0 |
| **합계** | **2** | **1 (FIXED)** | **0** |

---

## 발견된 이슈

### 수정 완료 항목

#### TC-03: 카테고리 화이트리스트 검증 누락 — FIXED

**심각도**: Minor (잠재적 데이터 무결성 문제)

**발견 위치**: `index.html` — `handleGenerate()` 함수 (수정 전 라인 549)

**문제 설명**:
`handleGenerate()` 함수에서 `categorySelect.value`를 읽어와 별도의 화이트리스트 검증 없이 바로 사용하고 있었습니다. HTML `<select>` 태그는 정적 `<option>` 4개(IT/개발, 자산관리, 루틴/헬스, 마케팅)만 제공하지만, 브라우저 개발자 도구나 프로그래매틱 DOM 조작으로 `categorySelect.value`에 임의의 값을 주입하는 것이 가능합니다.

예시 공격 경로:
```javascript
// 개발자 도구에서 실행 가능
document.getElementById('category-select').value = '악성입력<script>alert(1)</script>'
// -> 버튼 클릭 시 해당 값이 그대로 category로 사용됨
```

`matrixEngine.js`의 `generateLocalPlan()`에 `|| this.templates["IT/개발"]` fallback이 존재하여 XSS 렌더링은 차단되나, 비정상 카테고리 값이 LocalStorage에 그대로 저장되어 BADGE_STYLES 매핑 실패 및 `bg-slate-700` 기본 배지로 표시되는 부작용이 있었습니다.

**수정 내용**:

수정 전 (`index.html` 라인 549):
```javascript
const category = categorySelect.value;
```

수정 후 (`index.html` 라인 552~554):
```javascript
// 카테고리 화이트리스트 검증 (VALID_CATEGORIES에 없으면 기본값으로 fallback)
const rawCategory = categorySelect.value;
const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'IT/개발';
```

아울러 상수 블록에 `VALID_CATEGORIES` 배열을 추가하여 `BADGE_STYLES`와 단일 진실 소스(Single Source of Truth)를 공유하도록 했습니다 (`index.html` 라인 278~279):
```javascript
// ── 허용된 카테고리 화이트리스트 (TC-03: 미등록 카테고리 차단) ──
const VALID_CATEGORIES = ['IT/개발', '자산관리', '루틴/헬스', '마케팅'];
```

---

## 각 TC 상세 검증 결과

### TC-01: 빈 제목 제출 차단 — PASS

**시나리오**: 프로젝트 제목 input이 비어있거나 공백만 있을 때 "스마트 로드맵 생성" 버튼을 눌러도 실행이 차단되어야 함.

**판정 근거**:

1. `handleGenerate()` 라인 551 (`const title = titleInput.value.trim()`): `trim()`으로 공백 전용 입력도 빈 문자열로 처리함.

2. 라인 555 (`if (!title) {`): `title`이 빈 문자열이면 즉시 guard 진입.

3. 라인 556 (`titleInput.classList.add('input-error')`): CSS `.input-error { outline: 2px solid #ef4444 !important; }` 클래스를 적용하여 빨간 테두리로 시각적 강조.

4. 라인 557 (`titleError.classList.remove('hidden')`): `<p id="title-error" role="alert">제목을 입력해 주세요.</p>` 요소를 표시하여 오류 메시지 노출.

5. 라인 558 (`titleInput.focus()`): input으로 포커스 이동.

6. 라인 560~564: `input` 이벤트에 일회용 리스너를 등록하여 사용자가 타이핑을 시작하면 오류 상태 자동 해제.

7. 라인 566 (`return`): 함수 실행 중단으로 로드맵 생성 로직에 진입하지 않음.

**결과**: PASS

---

### TC-02: LocalStorage 비어있을 때 빈 상태 UI — PASS

**시나리오**: 최초 접속 시(`roadmap_plans` 키 없음 또는 빈 배열) 사이드바가 에러 없이 빈 상태 UI를 렌더링해야 함.

**판정 근거**:

1. `loadPlans()` 함수 (라인 300~307):
   ```javascript
   try {
     const raw = localStorage.getItem(STORAGE_KEY);
     return raw ? JSON.parse(raw) : [];
   } catch {
     return [];
   }
   ```
   - `localStorage.getItem()`이 `null`을 반환하면 `raw ? ... : []`에 의해 빈 배열 반환.
   - `JSON.parse()` 예외 발생 시 catch 블록에서 빈 배열 반환.
   - `|| []` 와 동등한 `raw ? ... : []` fallback 패턴으로 null 안전 처리 완비.

2. `renderSidebar()` 함수 (라인 333~348):
   ```javascript
   if (plans.length === 0) {
     const empty = document.createElement('li');
     // ...
     empty.innerHTML = `
       <svg ...></svg>
       <p class="text-xs text-slate-600">저장된 로드맵 없음</p>
     `;
     listEl.appendChild(empty);
     return;
   }
   ```
   - 빈 배열일 때 안내 메시지("저장된 로드맵 없음")와 아이콘을 포함한 빈 상태 UI를 렌더링.

3. `DOMContentLoaded` 핸들러 (라인 718~722):
   - 앱 초기화 시 `renderSidebar()` 먼저 호출.
   - `loadPlans()` 결과가 빈 배열이면 `if (plans.length > 0)` 블록 건너뜀 — 에러 없이 종료.

**결과**: PASS

---

### TC-03: 존재하지 않는 카테고리 Fallback — FIXED

**시나리오**: `matrixEngine.js`의 `generateLocalPlan()`에서 templates에 없는 카테고리가 들어올 때 "IT/개발"로 fallback해야 하며, `handleGenerate()`에서 정의되지 않은 카테고리 값이 넘어오는 경로가 차단되어야 함.

**판정 근거**:

1. `matrixEngine.js` 라인 55 — Fallback 로직 확인:
   ```javascript
   const template = this.templates[category] || this.templates["IT/개발"];
   ```
   존재하지 않는 카테고리에 대해 "IT/개발" fallback 적용됨. PASS.

2. `index.html` 인라인 MatrixEngine 라인 256 — 동일한 fallback 로직 확인됨. PASS.

3. `index.html` `handleGenerate()` — 수정 전 화이트리스트 검증 미존재: **FAIL**
   - `<select>` 태그 외부에서 `categorySelect.value`에 임의 값 주입 가능한 경로 존재.
   - 비정상 값이 LocalStorage에 저장되어 UI 배지 표시 오류 및 데이터 무결성 저하 위험.

**수정 내용**: 위 "발견된 이슈 — TC-03" 섹션 참조.

**수정 후 재검증**:
- `VALID_CATEGORIES` 배열에 없는 값은 `'IT/개발'`로 강제 치환됨을 코드에서 확인.
- 화이트리스트 밖 임의 카테고리는 LocalStorage에 저장되지 않음을 보장.

**결과**: FIXED (수정 후 PASS)

---

## 코드 수정 내역

### 수정 파일: `index.html`

**수정 1 — VALID_CATEGORIES 상수 추가** (라인 278~279 삽입):
```javascript
// ── 허용된 카테고리 화이트리스트 (TC-03: 미등록 카테고리 차단) ──
const VALID_CATEGORIES = ['IT/개발', '자산관리', '루틴/헬스', '마케팅'];
```

**수정 2 — handleGenerate() 카테고리 검증 로직 추가** (라인 552~554):
```javascript
// 카테고리 화이트리스트 검증 (VALID_CATEGORIES에 없으면 기본값으로 fallback)
const rawCategory = categorySelect.value;
const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'IT/개발';
```

**수정 목적**: DOM 외부에서 주입된 비정상 카테고리 값이 LocalStorage에 저장되는 경로를 차단하고, `BADGE_STYLES` 매핑 실패로 인한 UI 오류를 방지.

---

## 추가 관찰 사항 (Minor)

### 중복 MatrixEngine 정의 (코드 품질)

**심각도**: Minor — 기능 오류 없음, 유지보수성 저하

`index.html` 내 인라인 `<script>` (라인 236~265)에 `MatrixEngine` 객체가 직접 정의되어 있고, `skills/matrixEngine.js`에도 동일한 객체가 정의되어 있습니다. 두 파일 중 하나를 수정하면 다른 쪽에도 반영해야 하는 이중 유지보수 부담이 존재합니다.

**권고**: `index.html`이 `<script src="skills/matrixEngine.js">` 방식으로 외부 파일을 참조하도록 리팩토링 권장. 단, 현재 구조는 프로젝트 규칙("단일 index.html 파일로 최종 마감")과 충돌할 수 있으므로 팀 합의 후 결정 필요.

### 빈 상태 UI 가시성 (UX)

**심각도**: Minor

사이드바 빈 상태 텍스트 (`text-slate-600`)가 배경(`bg-slate-900`)과의 명암 대비가 낮아 가독성이 다소 떨어집니다. `text-slate-500` 이상으로 변경하면 접근성 기준(WCAG AA)에 더 부합합니다.

---

## 종합 품질 평가

| 항목 | 평가 |
|------|------|
| 입력 유효성 검사 | 우수 — trim() + input-error 클래스 + aria alert 완비 |
| LocalStorage 안전성 | 우수 — null/예외 모두 방어 처리 |
| 카테고리 화이트리스트 | 수정 완료 — VALID_CATEGORIES 검증 추가 |
| XSS 방지 | 우수 — escapeHtml() 일관 적용 |
| 접근성 | 양호 — aria-live, aria-label, role 속성 적용 |

**검증 3개 TC 중 2개 최초 PASS, 1개 코드 수정 후 PASS.**

수정 사항은 기능 오류 수준이 아닌 잠재적 데이터 무결성 문제 예방 조치이며, 핵심 기능(빈 제목 차단, 빈 LocalStorage 처리, matrixEngine fallback)은 모두 정상 동작함을 확인했습니다.

현재 코드 품질은 로컬 동작 기준으로 배포 가능한 수준으로 판단합니다.