# QA 검증 보고서

**프로젝트**: AI 스마트 아이디어 발전소 & 액션 플래너  
**검증일**: 2026-05-23  
**검증자**: QA Engineer  
**검증 대상**: index.html, api/generate.js  

---

## 검증 결과 요약

| TC ID | 항목 | 결과 | 비고 |
|-------|------|------|------|
| TC-1 | API 키 누락/통신 오류 시 무한 로딩 방지 | PASS | finally 블록에서 hideLoadingOverlay() 보장, alert 표시 확인 |
| TC-2 | 구형 데이터 하위 호환성 | PASS | aiPlan undefined 시 모든 접근 경로에서 안전 처리 확인 |
| TC-3 | 잘못된 JSON 응답 예외 처리 | PASS | JSON.parse 실패 전파, isValidPlan 검증 및 fallback 유도 확인 |
| TC-4 | 기타 견고성 | PASS | 0 나누기 방지, 빈 입력 차단, 빈 텍스트 저장 방지 확인 |

---

## 상세 검증 내용

### TC-1: API 키 누락 / 통신 오류 시 무한 로딩 방지

**[api/generate.js]**

- `OPENROUTER_API_KEY` 없음 → 199~218행: `if (openrouterKey)` 분기가 실행되지 않고 경고 로그 후 OpenAI fallback 진입
- `OPENAI_API_KEY` 없음 → 221~239행: `if (openaiKey)` 분기도 건너뜀
- 두 키 모두 없을 때 → 242~246행: `res.status(500).json({ error: "AI 서비스에 일시적인 문제...", code: "LLM_UNAVAILABLE" })` 반환. 500 응답이 정상 반환됨을 확인.

**[index.html — generateAIPlan()]**

- 676~709행 전체가 `try { ... } catch(err) { ... } finally { hideLoadingOverlay(); }` 구조로 감싸져 있음.
- 682~685행: `response.ok`가 false이면 `throw new Error(...)` 로 예외를 발생시켜 catch 블록으로 전달.
- 704~706행 (catch): `console.error` 후 `alert()` 로 사용자에게 한국어 오류 메시지 표시.
- 707~709행 (finally): `hideLoadingOverlay()` 가 반드시 실행됨 — 성공, 실패 어느 경우에도 로딩 UI 닫힘.

**결론**: PASS — 무한 로딩 발생 경로 없음. 오류 시 사용자 피드백 제공.

---

### TC-2: 구형 데이터 하위 호환성

**[index.html — buildTodoItem()]**

- 796~799행:
  ```javascript
  if (todo.aiPlan) {
      li.appendChild(buildAIPlanSection(todo));
  }
  ```
  `aiPlan`이 `undefined` / `null` / falsy 이면 `buildAIPlanSection()`을 전혀 호출하지 않음. 구형 todo도 오류 없이 렌더링됨을 확인.

**[index.html — toggleStep()]**

- 641행:
  ```javascript
  if (!todo || !todo.aiPlan) return;
  ```
  `aiPlan`이 없는 todo에 대해 early return으로 안전하게 종료됨.

**[index.html — saveAIPlan()]**

- 630~631행:
  ```javascript
  const todo = todos.find((t) => t.id === todoId);
  if (!todo) return;
  ```
  id에 해당하는 todo가 없을 때 early return. 안전함.

**[index.html — loadTodos()]**

- 561~569행:
  ```javascript
  try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
  } catch {
      return [];
  }
  ```
  localStorage 데이터가 없거나 JSON 파싱이 실패해도 빈 배열을 반환. 앱이 크래시되지 않음.

**결론**: PASS — 구형 데이터 및 손상된 JSON에 대한 방어 로직 완비.

---

### TC-3: 잘못된 JSON 응답 예외 처리

**[api/generate.js — callOpenRouter() / callOpenAI()]**

- 92행 (`callOpenRouter`): `return JSON.parse(content);` — `JSON.parse` 실패 시 `SyntaxError`가 throw되어 호출자(핸들러)로 전파됨.
- 134행 (`callOpenAI`): 동일한 패턴. 예외가 상위로 전파됨.
- 핸들러 202~215행: `try { ... } catch(err) { console.warn(...) }` 로 OpenRouter 예외를 잡고 fallback 진입.
- 핸들러 223~236행: OpenAI fallback도 동일한 try/catch 구조. 실패 시 최종 500 반환.

**[api/generate.js — isValidPlan()]**

- 146~159행:
  - `payload`가 null/undefined이면 false
  - `category`, `summary`가 string이 아니면 false
  - `action_steps`가 배열이 아니거나 비어있으면 false
  - 각 step이 `{ step: number, task: string }` 구조가 아니면 false
  - 스키마 불충족 시 정확하게 false를 반환함을 확인.

- 205~207행 / 227~229행:
  ```javascript
  if (!isValidPlan(plan)) {
      throw new Error("OpenRouter 응답이 기대 스키마와 다릅니다.");
  }
  ```
  `isValidPlan()` 실패 시 `throw new Error()` 로 fallback을 유도함. 확인됨.

**[index.html — generateAIPlan()]**

- 694~700행:
  ```javascript
  action_steps: (result.action_steps || []).map((s, i) => ({
      step: s.step ?? i + 1,
      task: s.task ?? "",
      completed: false,
  })),
  ```
  `result.action_steps`가 없거나 배열이 아닐 때 `|| []` 패턴으로 안전 처리됨. `step`, `task` 필드도 nullish coalescing으로 기본값 보장.

**결론**: PASS — JSON 파싱 실패 및 스키마 불일치에 대한 예외 처리 완비.

---

### TC-4: 기타 견고성

**[index.html — updateProgress()]**

- 871행:
  ```javascript
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  ```
  `total === 0` 조건으로 0 나누기를 방지함. 할 일이 하나도 없을 때 0%를 올바르게 표시.

**[index.html — handleAdd()]**

- 891~892행:
  ```javascript
  const text = todoInputEl.value.trim();
  if (!text) return;
  ```
  `trim()` 후 빈 문자열이면 즉시 return. 공백만 입력해도 차단됨.

**[index.html — startEdit() commit 함수]**

- 953~954행:
  ```javascript
  const newText = input.value.trim();
  if (!newText) return;
  ```
  편집 저장 시 빈 텍스트를 막음. 기존 텍스트가 삭제되어 빈 값으로 저장되는 상황 방지.

**결론**: PASS — 0 나누기, 빈 입력, 빈 텍스트 저장 모두 안전하게 처리됨.

---

## 발견된 버그 및 수정 내역

발견된 버그 없음

---

## 최종 의견

검증 대상 코드(index.html, api/generate.js)는 체크리스트 전 항목에서 PASS 판정을 받았습니다.

- **방어 코딩 수준 우수**: API 키 누락, 네트워크 오류, LocalStorage 손상, LLM 잘못된 응답 등 주요 오류 시나리오에 대해 try/catch, early return, fallback 분기가 일관성 있게 적용되어 있습니다.
- **무한 로딩 위험 없음**: `finally` 블록에서 `hideLoadingOverlay()`가 보장되어 있어 성공·실패 어느 경우에도 로딩 UI가 닫힙니다.
- **하위 호환성 완비**: `aiPlan` 필드가 없는 구형 데이터도 오류 없이 렌더링됩니다.
- **입력 유효성 검사 완비**: 빈 문자열, 공백 전용 입력, 편집 후 빈 텍스트 저장이 모두 차단됩니다.

현재 코드 품질로 운영 환경 배포가 가능한 수준으로 판단합니다.
