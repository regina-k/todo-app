# [PRD] 기존 메모 앱 기능 고도화: AI 스마트 아이디어 발전소 & 액션 플래너 (.env 보안 버전)

## 1. 제품 개요
- **정의**: 기존 로컬 스토리지 기반 메모 앱을 고도화하여, 사용자가 작성한 아이디어를 AI가 분석해 5단계 실행 계획(To-Do)으로 확장해 주는 기능 탑재.
- **보안 요구사항**: API Key는 절대 클라이언트(UI)에 노출하지 않으며, 루트 폴더의 `.env` 파일(Vercel 환경변수)에서 안전하게 로드하여 내부 프록시를 통해 통신함.

## 2. 고도화 요구사항 (Migration Requirements)
1. **기존 기능 유지**: 기존 메모 앱의 메모 등록, 삭제, 리스트 조회 기능은 그대로 유지됨.
2. **UI 입력창 제거 및 백엔드 이관**: 화면에서 API Key를 입력받던 기존 UI 요소를 전면 제거하고, 환경변수(`process.env`) 시스템으로 대체함.
3. **OpenRouter API 서버리스 프록시 구현**: Vercel 배포 규격에 맞춰 `api/generate.js` 구조를 생성하고, `.env`에 저장된 `OPENROUTER_API_KEY`를 호출함. (실패 시 `OPENAI_API_KEY`를 사용하는 GPT 모델 Fallback 처리 내장)
4. **상태 관리 동적 바인딩**: AI가 생성한 5단계 실행 계획(`action_steps`)은 기존 메모 데이터 구조의 서브 객체로 병합되어 LocalStorage에 함께 저장되며, 체크박스 토글 상태도 실시간 유지됨.

## 3. 데이터 구조 확장 (스키마)
```json
{
  "id": "기존 메모 ID",
  "content": "기존 메모 내용",
  "timestamp": "생성 시간",
  "ai_analysis": {
    "category": "IT/앱개발 | 자기계발 | 마케팅 | 생산성",
    "summary": "AI가 요약한 핵심 한 줄",
    "action_steps": [
      {"step": 1, "task": "실행 계획 1", "completed": false},
      {"step": 2, "task": "실행 계획 2", "completed": false}
    ]
  }
}