/**
 * Claude 커스텀 스킬: 로컬 알고리즘 기반 프로젝트 로드맵 생성 엔진
 */
const MatrixEngine = {
    // 카테고리별 정밀 마일스톤 데이터 템플릿
    templates: {
        "IT/개발": {
            summary: "성공적인 서비스 런칭을 위한 아키텍처 설계 및 에이전트 협업 개발 로드맵",
            steps: [
                "요구사항 정의 및 기획서(PRD) 작성하기",
                "UI/UX 와이어프레임 설계 및 컴포넌트 뼈대 구축하기",
                "핵심 비즈니스 로직 및 로컬 데이터 파이프라인 연동하기",
                "QA 에이전트 시나리오 기반 예외 처리 및 통합 테스트 진행하기",
                "Vercel 플랫폼을 활용한 프로덕션 빌드 및 최종 배포하기"
            ]
        },
        "자산관리": {
            summary: "안정적인 자산 증식과 포트폴리오 최적화를 위한 자본 배분 가이드라인",
            steps: [
                "현재 총 자산 및 유동 자산 규모 정확히 측정하기",
                "안전 자산(예금/채권)과 위험 자산(주식/ETF) 최적 비중 설정하기",
                "월 현금흐름(이자 및 배당 수입) 극대화를 위한 종목 스크리닝하기",
                "세금 혜택 및 연말정산 공제 상품 연계안 검토하기",
                "정기적인 리밸런싱 주기 설정 및 모니터링 대시보드 구축하기"
            ]
        },
        "루틴/헬스": {
            summary: "지속 가능한 신체 기능 발달 및 완벽한 피지컬 컨디셔닝을 위한 계획",
            steps: [
                "현재 인바디 데이터 측정 및 명확한 근골격량/체지방률 목표 설정하기",
                "부위별 분할 운동 프로그램 및 주간 루틴 스케줄링하기",
                "기초대사량 기준 탄단지(탄수화물/단백질/지방) 매크로 식단 설계하기",
                "운동 수행 능력 점검 및 세트별 중량 점진적 과부하 기록하기",
                "충분한 휴식 및 컨디션 회복을 위한 서플리먼트 타이밍 배치하기"
            ]
        },
        "마케팅": {
            summary: "타겟 고객 유입 및 브랜드 인지도 극대화를 위한 그로스해킹 캠페인",
            steps: [
                "시장 조사 및 핵심 페르소나(Target Customer) 정의하기",
                "캠페인 핵심 메시지 슬로건 및 크리에이티브 콘텐츠 제작하기",
                "소셜 미디어 및 광고 매체별 예산 배분 및 미디어믹스 짜기",
                "전환율(CVR) 추적을 위한 데이터 분석 픽셀 및 링크 심기",
                "초기 성과 지표(KPI) 모니터링 후 광고 효율 최적화 피드백 반영하기"
            ]
        }
    },

    /**
     * 입력값 조합형 로드맵 생성 함수 (AI API 호출 없이 0.1초 만에 JSON 반환)
     * @param {string} title - 프로젝트 명칭
     * @param {string} category - 선택 카테고리
     */
    generateLocalPlan(title, category) {
        const template = this.templates[category] || this.templates["IT/개발"];
        
        // 유저가 입력한 프로젝트 제목을 할 일 목록에 동적으로 합성하여 커스텀 느낌 극대화
        const customizedSteps = template.steps.map((task, index) => {
            return {
                step: index + 1,
                task: `[${title}] ${task}`,
                completed: false
            };
        });

        return {
            category: category,
            summary: `[${title}] 프로젝트 수립 완료: ${template.summary}`,
            action_steps: customizedSteps
        };
    }
};

// 브라우저 전역 객체 또는 모듈 스펙에 바인딩
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatrixEngine;
} else {
    window.MatrixEngine = MatrixEngine;
}