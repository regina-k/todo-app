/**
 * Claude 커스텀 스킬: OpenRouter API 통신 및 Fallback 처리 모듈
 */
const LLMClient = {
    // OpenRouter 설정 기본값
    API_URL: "https://openrouter.ai/api/v1/chat/completions",
    DEFAULT_MODEL: "deepseek/deepseek-v4-flash:free",
    BACKEND_MODEL: "openai/gpt-4o-mini", // 백업 모델

    /**
     * AI에게 아이디어 원문을 보내어 구조화된 JSON 답변을 받아오는 핵심 스킬 함수
     * @param {string} idea - 유저가 입력한 아이디어 한 줄
     * @param {string} apiKey - 유저 환경 또는 인풋에서 제공된 API Key
     */
    async generateActionPlan(idea, apiKey) {
        const systemPrompt = `
        너는 비즈니스 컨설턴트이자 최고의 프로젝트 매니저야.
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
        }
        `;

        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.href,
                    "X-Title": "AI Idea Powerhouse"
                },
                body: JSON.stringify({
                    model: this.DEFAULT_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `내 아이디어: ${idea}` }
                    ],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Primary model failed");
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);

        } catch (error) {
            console.warn("기본 모델 호출 실패, 백업 모델로 전환합니다.", error);
            // Fallback 로직: 실패 시 OpenAI 혹은 대안 모델 구동 구조
            return this.fetchFallback(idea, apiKey);
        }
    },

    async fetchFallback(idea, apiKey) {
        // 백업 모델 호출 로직 (구조 동일, 모델명만 교체)
        const response = await fetch(this.API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: this.BACKEND_MODEL,
                messages: [
                    { role: "user", content: `${idea} 에 대한 카테고리, 요약, 실행계획 5단계를 JSON으로 짜줘.` }
                ]
            })
        });
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    }
};