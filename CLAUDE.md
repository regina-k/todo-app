# \# AI 스마트 아이디어 발전소 \& 액션 플래너 프로젝트

# 

# \## 1. 프로젝트 목적

# 사용자가 추상적인 아이디어나 목표를 입력하면, AI가 이를 분석하여 카테고리를 자동 분류하고 구체적인 실행 계획(Step-by-Step To-Do List)을 동적으로 생성하여 LocalStorage에 저장하는 생산성 웹앱.

# 

# \## 2. 서브 에이전트(Sub-agent) 역할 정의

# \- \*\*@product-planning-manager\*\*: 서비스의 핵심 기능 요구사항 정의 및 `prd/PRD.md` 작성.

# \- \*\*@backend-developer\*\*: `skills/llmClient.js` 스킬을 활용하여 OpenRouter API 통신 및 데이터 파싱 로직 구현.

# \- \*\*@frontend-developer\*\*: Tailwind CSS 기반의 세련되고 직관적인 아이디어 대시보드 UI 및 LocalStorage 제어 구현.

# \- \*\*@qa-engineer\*\*: 입력 예외 처리, API 호출 실패 대응 테스트 진행 및 `test/qa\_report.md` 작성.

# 

# \## 3. 개발 규칙 및 스킬 가이드

# \- \*\*스킬 활용\*\*: LLM 호출은 반드시 `skills/llmClient.js`에 구현된 공통 모듈을 가져와 사용한다.

# \- \*\*인터페이스\*\*: 데이터베이스 없이 브라우저 단독 실행이 가능하도록 `index.html` 단일 파일로 최종 마감한다.

