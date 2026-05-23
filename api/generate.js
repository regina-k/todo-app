/**
 * @file api/generate.js
 * @description Vercel serverless function — AI 액션 플랜 생성 엔드포인트.
 *
 * POST /api/generate
 * Body: { idea: string }
 * Response: { category, summary, action_steps[] }
 *
 * Primary  : OpenRouter  deepseek/deepseek-v4-flash:free  (OPENROUTER_API_KEY)
 * Fallback : OpenAI      gpt-4o-mini                      (OPENAI_API_KEY)
 */

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `너는 비즈니스 컨설턴트이자 최고의 프로젝트 매니저야.
사용자가 아이디어를 주면 이를 분석해서 반드시 아래의 JSON 포맷으로만 답변해줘. 다른 설명은 일절 금지해.

{
  "category": "아이디어 카테고리 (예: IT/앱개발, 생산성, 자기계발, 마케팅 등)",
  "summary": "아이디어의 핵심을 관통하는 멋진 한 줄 요약",
  "action_steps": [
    {"step": 1, "task": "첫 번째로 실행해야 할 구체적인 행동 지침"},
    {"step": 2, "task": "두 번째로 실행해야 할 구체적인 행동 지침"},
    {"step": 3, "task": "세 번째로 실행해야 할 구체적인 행동 지침"},
    {"step": 4, "task": "네 번째로 실행해야 할 구체적인 행동 지침"},
    {"step": 5, "task": "마지막 검증 및 실행 단계 지침"}
  ]
}`;

// ──────────────────────────────────────────────
// CORS 헤더 유틸리티
// ──────────────────────────────────────────────
/**
 * 응답에 CORS 헤더를 설정한다.
 * @param {import('http').ServerResponse} res
 */
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ──────────────────────────────────────────────
// LLM 호출 헬퍼
// ──────────────────────────────────────────────
/**
 * OpenRouter API를 통해 LLM을 호출하고 파싱된 JSON을 반환한다.
 *
 * @param {string} idea         - 사용자 아이디어 텍스트
 * @param {string} apiKey       - OpenRouter API 키 (process.env.OPENROUTER_API_KEY)
 * @param {string} refererOrigin - 요청 출처 (req.headers.origin)
 * @returns {Promise<object>}   - 파싱된 액션 플랜 JSON
 * @throws {Error}              - HTTP 오류 또는 파싱 실패 시
 */
async function callOpenRouter(idea, apiKey, refererOrigin) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": refererOrigin || "https://ai-idea-planner.vercel.app",
      "X-Title": "AI Smart Idea Planner",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v4-flash:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: idea },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(no body)");
    throw new Error(
      `OpenRouter HTTP ${response.status}: ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter: 응답 content가 비어 있습니다.");
  }

  return JSON.parse(content);
}

/**
 * OpenAI API를 통해 LLM을 호출하고 파싱된 JSON을 반환한다. (Fallback)
 *
 * @param {string} idea   - 사용자 아이디어 텍스트
 * @param {string} apiKey - OpenAI API 키 (process.env.OPENAI_API_KEY)
 * @returns {Promise<object>}
 * @throws {Error}
 */
async function callOpenAI(idea, apiKey) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: idea },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "(no body)");
    throw new Error(
      `OpenAI HTTP ${response.status}: ${errorText.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI: 응답 content가 비어 있습니다.");
  }

  return JSON.parse(content);
}

// ──────────────────────────────────────────────
// 응답 유효성 검증
// ──────────────────────────────────────────────
/**
 * LLM이 반환한 객체가 기대 스키마를 충족하는지 검사한다.
 *
 * @param {unknown} payload
 * @returns {boolean}
 */
function isValidPlan(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (typeof payload.category !== "string") return false;
  if (typeof payload.summary !== "string") return false;
  if (!Array.isArray(payload.action_steps)) return false;
  if (payload.action_steps.length === 0) return false;

  return payload.action_steps.every(
    (s) =>
      typeof s === "object" &&
      typeof s.step === "number" &&
      typeof s.task === "string"
  );
}

// ──────────────────────────────────────────────
// Vercel 핸들러
// ──────────────────────────────────────────────
/**
 * POST /api/generate
 *
 * @param {import('@vercel/node').VercelRequest}  req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // CORS 헤더는 모든 응답에 공통 적용
  setCorsHeaders(res);

  // OPTIONS preflight 처리
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // POST 외 메서드 거부
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed", code: "METHOD_NOT_ALLOWED" });
  }

  // 요청 바디 파싱
  const { idea } = req.body ?? {};

  if (!idea || typeof idea !== "string" || idea.trim() === "") {
    return res
      .status(400)
      .json({ success: false, error: "idea 필드가 필요합니다.", code: "MISSING_IDEA" });
  }

  const trimmedIdea = idea.trim();
  const origin = req.headers.origin ?? "";

  // ── 1차: OpenRouter ──
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (openrouterKey) {
    try {
      const plan = await callOpenRouter(trimmedIdea, openrouterKey, origin);

      if (!isValidPlan(plan)) {
        throw new Error("OpenRouter 응답이 기대 스키마와 다릅니다.");
      }

      // action_steps 최대 5개로 자름
      plan.action_steps = plan.action_steps.slice(0, 5);

      return res.status(200).json(plan);
    } catch (err) {
      console.warn("[generate] OpenRouter 호출 실패 — Fallback 시도:", err.message);
    }
  } else {
    console.warn("[generate] OPENROUTER_API_KEY 환경변수 없음 — Fallback 시도");
  }

  // ── 2차: OpenAI fallback ──
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const plan = await callOpenAI(trimmedIdea, openaiKey);

      if (!isValidPlan(plan)) {
        throw new Error("OpenAI 응답이 기대 스키마와 다릅니다.");
      }

      plan.action_steps = plan.action_steps.slice(0, 5);

      return res.status(200).json(plan);
    } catch (err) {
      console.error("[generate] OpenAI Fallback 호출 실패:", err.message);
    }
  } else {
    console.error("[generate] OPENAI_API_KEY 환경변수도 없음");
  }

  // ── 모든 모델 실패 ──
  return res.status(500).json({
    success: false,
    error: "AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    code: "LLM_UNAVAILABLE",
  });
}
