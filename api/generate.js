const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_URL     = "https://api.openai.com/v1/chat/completions";

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

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function callOpenRouter(idea, apiKey, refererOrigin) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer":  refererOrigin || "https://todo-app-g3kt.vercel.app",
      "X-Title":       "AI Smart Idea Planner",
    },
    body: JSON.stringify({
      model:           "deepseek/deepseek-r1:free",
      messages:        [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: idea },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const errorText = response.ok ? null : await response.text().catch(() => "(no body)");
  if (!response.ok) {
    throw new Error(`OpenRouter HTTP ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data    = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter: 응답 content 비어있음");
  return JSON.parse(content);
}

async function callOpenAI(idea, apiKey) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:           "gpt-4o-mini",
      messages:        [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: idea },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const errorText = response.ok ? null : await response.text().catch(() => "(no body)");
  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data    = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI: 응답 content 비어있음");
  return JSON.parse(content);
}

function isValidPlan(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (typeof payload.category !== "string")     return false;
  if (typeof payload.summary  !== "string")     return false;
  if (!Array.isArray(payload.action_steps))     return false;
  if (payload.action_steps.length === 0)        return false;
  return payload.action_steps.every(
    (s) => typeof s === "object" && typeof s.step === "number" && typeof s.task === "string"
  );
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { idea } = req.body ?? {};
  if (!idea || typeof idea !== "string" || !idea.trim())
    return res.status(400).json({ error: "idea 필드가 필요합니다." });

  // ── 진단 정보 (키 노출 없이 존재 여부만 확인) ──
  const diag = {
    nodeVersion:      process.version,
    fetchAvailable:   typeof fetch !== "undefined",
    hasOpenrouterKey: !!process.env.OPENROUTER_API_KEY,
    hasOpenaiKey:     !!process.env.OPENAI_API_KEY,
    orError:          null,
    oaError:          null,
  };
  console.log("[generate] 진단:", diag);

  if (!diag.fetchAvailable) {
    return res.status(500).json({ error: "fetch 미지원 환경입니다. Node.js 버전을 확인하세요.", diag });
  }

  const trimmedIdea = idea.trim();
  const origin      = req.headers.origin ?? "";

  // ── 1차: OpenRouter (deepseek-r1:free) ──
  if (diag.hasOpenrouterKey) {
    try {
      const plan = await callOpenRouter(trimmedIdea, process.env.OPENROUTER_API_KEY, origin);
      if (!isValidPlan(plan)) throw new Error("OpenRouter 응답 스키마 불일치");
      plan.action_steps = plan.action_steps.slice(0, 5);
      return res.status(200).json(plan);
    } catch (err) {
      diag.orError = err.message;
      console.warn("[generate] OpenRouter 실패:", err.message);
    }
  }

  // ── 2차: OpenAI (gpt-4o-mini) ──
  if (diag.hasOpenaiKey) {
    try {
      const plan = await callOpenAI(trimmedIdea, process.env.OPENAI_API_KEY);
      if (!isValidPlan(plan)) throw new Error("OpenAI 응답 스키마 불일치");
      plan.action_steps = plan.action_steps.slice(0, 5);
      return res.status(200).json(plan);
    } catch (err) {
      diag.oaError = err.message;
      console.error("[generate] OpenAI 실패:", err.message);
    }
  }

  // ── 모두 실패 — 진단 정보 포함 반환 ──
  return res.status(500).json({
    success: false,
    error:   "LLM_UNAVAILABLE",
    diag,
  });
};
