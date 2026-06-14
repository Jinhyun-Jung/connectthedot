// AI를 사용하여 텍스트를 Mermaid 다이어그램으로 변환

const AIMermaidConverter = {
    /**
     * 텍스트를 Mermaid graph 형식으로 변환
     * @param {string} text - 사용자 입력 텍스트
     * @returns {Promise<{mermaidCode: string, nodeContents: Object}>} Mermaid 코드와 노드 본문 정보
     */
    async textToMermaid(text) {
        if (!text || text.trim().length === 0) {
            throw new Error('변환할 텍스트를 입력해주세요.');
        }

        console.log('🤖 AI 분석 시작...');

        const prompt = this.buildPrompt(text);

        try {
            // MCP ChatGPT 사용 (이미 설정된 MCP 서버 활용)
            const response = await this.callChatGPT(prompt);

            console.log('✅ AI 응답 받음');

            // Mermaid 코드 추출
            const mermaidCode = this.extractMermaidCode(response);

            console.log('📋 Mermaid 코드:', mermaidCode);

            // 노드 본문 정보 추출
            const nodeContents = this.extractNodeContents(response);

            console.log('📝 노드 본문 정보:', nodeContents);

            return {
                mermaidCode: mermaidCode,
                nodeContents: nodeContents
            };

        } catch (error) {
            console.error('❌ AI 변환 실패:', error);
            throw new Error('AI 분석 중 오류가 발생했습니다: ' + error.message);
        }
    },

    /**
     * AI 프롬프트 생성
     * @param {string} text - 입력 텍스트
     * @returns {string} 프롬프트
     */
    buildPrompt(text) {
        // 고유 요청 ID 생성 (이전 대화와 구분)
        const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return `[독립 요청 - 세션 ID: ${requestId}]

=== 중요 지시사항 ===
1. 이 요청은 완전히 새로운 독립적인 요청입니다.
2. 이전에 처리한 텍스트, 대화, 마인드맵은 절대 참조하지 마세요.
3. 오직 아래 "입력 텍스트" 섹션에 있는 내용만 분석하세요.
4. 이전 요청의 노드(A, B, C...)를 재사용하지 마세요.
======================

다음 텍스트를 분석하여 Mermaid.js graph TD 형식의 마인드맵으로 변환해주세요.

**입력 텍스트 (이 텍스트만 분석):**
---시작---
${text}
---끝---

**변환 규칙:**
1. 노드는 A, B, C, D... 순서로 새롭게 명명 (이전 요청과 무관)
2. 화살표는 --> 사용
3. 노드 텍스트는 [대괄호] 사용
4. 계층 구조가 명확하게 드러나도록 연결
5. 중심 주제는 A로 시작
6. 상위 → 하위 관계를 화살표로 표현

**출력 형식 예시:**
\`\`\`mermaid
graph TD
    A[중심 주제]
    B[주요 개념 1]
    C[주요 개념 2]
    D[세부 항목 1]
    E[세부 항목 2]

    A --> B
    A --> C
    B --> D
    B --> E
\`\`\`

**중요:**
- 코드 블록(\`\`\`mermaid)을 반드시 사용하세요
- graph TD로 시작하세요
- 노드와 링크를 명확히 구분하세요
- 너무 복잡하지 않게, 주요 개념 위주로 구조화하세요 (최대 20개 노드)
- 위 "입력 텍스트" 섹션의 내용만 사용하세요`;
    },

    /**
     * ChatGPT API 호출 (Firebase Functions 사용)
     * @param {string} prompt - 프롬프트
     * @returns {Promise<string>} AI 응답
     */
    async callChatGPT(prompt) {
        // Make AI 또는 n8n 웹훅을 통한 AI 호출
        console.log('🤖 웹훅을 통해 AI 호출...');

        // 웹훅 URL 설정 (Make AI 또는 n8n에서 생성한 웹훅 URL)
        // 환경 변수나 설정에서 가져오거나, 직접 입력
        const webhookUrl = window.WEBHOOK_URL || 
                          localStorage.getItem('webhook_url') || 
                          'YOUR_WEBHOOK_URL_HERE'; // Make AI 또는 n8n 웹훅 URL로 교체

        if (webhookUrl === 'YOUR_WEBHOOK_URL_HERE') {
            throw new Error('웹훅 URL이 설정되지 않았습니다. Make AI 또는 n8n에서 웹훅 URL을 설정해주세요.');
        }

        try {
            // 전송할 데이터 준비
            // 고유 요청 ID로 이전 대화와 구분 - 매번 완전히 새로운 ID
            const timestamp = Date.now();
            const randomPart = Math.random().toString(36).substr(2, 9);
            const requestId = `new_${timestamp}_${randomPart}`;

            // 시스템 메시지를 프롬프트 앞에 추가하는 방식으로 변경
            const systemInstruction = `[SYSTEM INSTRUCTION - MUST FOLLOW]
You are a mindmap generation expert. This is a BRAND NEW, INDEPENDENT request.
DO NOT reference any previous conversations, texts, or mindmaps.
ONLY analyze the text between "---시작---" and "---끝---" markers.
Start node IDs fresh from A, B, C...
Request ID: ${requestId}
[END SYSTEM INSTRUCTION]

`;

            // Make AI에서 사용할 messages 배열 (ChatGPT API 형식)
            // 중요: Make AI 시나리오에서 이 messages 배열을 OpenAI 모듈의 Messages 필드에 직접 매핑해야 함
            const messagesArray = [
                {
                    role: 'system',
                    content: `You are a mindmap generation expert.
CRITICAL RULES:
1. This is a completely NEW, INDEPENDENT request (ID: ${requestId})
2. You have NO memory of previous conversations
3. ONLY analyze text between "---시작---" and "---끝---" markers
4. Start fresh with node IDs: A, B, C, D...
5. NEVER include content from any other requests`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const requestData = {
                // 기본 프롬프트 (Make AI에서 prompt 필드만 사용하는 경우)
                prompt: systemInstruction + prompt,
                // OpenAI API 파라미터
                model: 'gpt-4o',
                temperature: 0.1,
                max_tokens: 4000,
                // ChatGPT API 형식의 messages 배열
                messages: messagesArray,
                // 세션/대화 관리 - 모두 새로운 값으로
                request_id: requestId,
                conversation_id: requestId,
                thread_id: requestId,
                session_id: requestId,
                // 컨텍스트 리셋 플래그들
                reset_context: true,
                new_conversation: true,
                fresh_start: true,
                no_memory: true,
                no_history: true,
                clear_history: true
            };
            
            console.log('📤 웹훅으로 전송하는 데이터:', {
                prompt: prompt.substring(0, 200) + '...', // 프롬프트 일부만 표시
                model: requestData.model,
                temperature: requestData.temperature,
                max_tokens: requestData.max_tokens
            });
            console.log('📤 전체 프롬프트 길이:', prompt.length, '자');
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            console.log('📡 웹훅 응답 상태:', response.status, response.statusText);
            console.log('📡 응답 헤더:', response.headers.get('content-type'));

            // 응답 본문을 텍스트로 먼저 가져오기
            const responseText = await response.text();
            console.log('📡 응답 본문 (원본):', responseText.substring(0, 200));

            // HTTP 오류 상태 확인
            if (!response.ok) {
                // JSON 파싱 시도
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(`서버 오류: ${errorData.error?.message || response.statusText}`);
                } catch (parseError) {
                    throw new Error(`서버 오류 (${response.status}): ${responseText || response.statusText}`);
                }
            }

            // JSON 파싱 시도
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('✅ JSON 파싱 성공:', Object.keys(data));
            } catch (parseError) {
                // JSON이 아닌 경우 텍스트로 처리
                console.warn('⚠️ JSON이 아닌 응답, 텍스트로 처리:', responseText.substring(0, 100));
                
                // "Accepted" 같은 상태 메시지인 경우
                if (responseText.trim() === 'Accepted' || responseText.trim() === 'OK') {
                    throw new Error('웹훅이 응답을 반환하지 않았습니다. Make AI 시나리오의 "Respond to webhook" 모듈이 제대로 설정되었는지 확인하세요.');
                }
                
                // 텍스트 응답을 그대로 반환
                return responseText;
            }

            // JSON 응답 처리
            // Make AI/n8n 응답 형식에 따라 조정
            if (data.response) {
                console.log('✅ 응답 형식: data.response');
                return data.response;
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
                console.log('✅ 응답 형식: data.choices[0].message.content');
                return data.choices[0].message.content;
            } else if (data.content) {
                console.log('✅ 응답 형식: data.content');
                return data.content;
            } else if (data.message) {
                console.log('✅ 응답 형식: data.message');
                return data.message;
            } else if (typeof data === 'string') {
                console.log('✅ 응답 형식: string');
                return data;
            } else {
                // JSON 응답 전체를 문자열로 변환
                console.log('⚠️ 알 수 없는 응답 형식, 전체 JSON 반환');
                console.log('응답 데이터:', data);
                return JSON.stringify(data);
            }

        } catch (error) {
            console.error('❌ 웹훅 호출 오류:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('웹훅 서버에 연결할 수 없습니다. 웹훅 URL을 확인하고 다시 시도해주세요.');
            }
            if (error.message.includes('JSON')) {
                throw new Error('웹훅 응답 형식 오류: ' + error.message + '. Make AI 시나리오의 "Respond to webhook" 모듈 설정을 확인하세요.');
            }
            throw error;
        }
    },

    /**
     * AI 응답에서 Mermaid 코드만 추출
     * @param {string} response - AI 응답
     * @returns {string} Mermaid 코드
     */
    extractMermaidCode(response) {
        // ```mermaid ... ``` 블록 추출
        const codeBlockMatch = response.match(/```mermaid\s*([\s\S]*?)\s*```/);

        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }

        // 코드 블록이 없으면 graph TD로 시작하는 부분 찾기
        const graphMatch = response.match(/(graph\s+TD[\s\S]*?)(?:```|$)/i);

        if (graphMatch) {
            return graphMatch[1].trim();
        }

        // 아무것도 찾지 못하면 전체 응답 반환 (최후의 수단)
        console.warn('⚠️ Mermaid 코드 블록을 찾을 수 없습니다. 전체 응답 사용.');
        return response;
    },

    /**
     * AI 응답에서 노드 본문 정보 추출
     * @param {string} response - AI 응답
     * @returns {Object} 노드 ID를 키로 하는 본문 정보 객체
     */
    extractNodeContents(response) {
        // ```json ... ``` 블록 추출
        const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

        if (jsonBlockMatch) {
            try {
                const jsonContent = jsonBlockMatch[1].trim();
                const nodeContents = JSON.parse(jsonContent);
                console.log('✅ 노드 본문 정보 파싱 성공:', Object.keys(nodeContents).length, '개 노드');
                return nodeContents;
            } catch (parseError) {
                console.warn('⚠️ JSON 파싱 실패:', parseError);
                return {};
            }
        }

        // JSON 블록이 없으면 일반 JSON 형식 찾기
        const jsonMatch = response.match(/\{[\s\S]*"A"[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const jsonContent = jsonMatch[0];
                const nodeContents = JSON.parse(jsonContent);
                console.log('✅ 노드 본문 정보 파싱 성공 (일반 형식):', Object.keys(nodeContents).length, '개 노드');
                return nodeContents;
            } catch (parseError) {
                console.warn('⚠️ JSON 파싱 실패:', parseError);
                return {};
            }
        }

        // 노드 본문 정보가 없으면 빈 객체 반환
        console.log('ℹ️ 노드 본문 정보가 없습니다.');
        return {};
    },

    /**
     * 간단한 텍스트 구조 분석 (AI 없이 로컬에서 처리)
     * @param {string} text - 입력 텍스트
     * @returns {string} 간단한 Mermaid 코드
     */
    parseSimpleStructure(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        let nodeCounter = 0;
        const getNodeId = () => String.fromCharCode(65 + (nodeCounter++)); // A, B, C...

        let mermaidCode = 'graph TD\n';
        const nodeStack = []; // 계층 추적

        lines.forEach(line => {
            const trimmed = line.trim();
            const indent = line.search(/\S/); // 들여쓰기 레벨

            // 들여쓰기로 계층 파악
            const level = Math.floor(indent / 2);

            // 노드 생성
            const nodeId = getNodeId();
            const title = trimmed.replace(/^[-*•]\s*/, ''); // 불릿 포인트 제거

            mermaidCode += `    ${nodeId}[${title}]\n`;

            // 부모 노드와 연결
            if (level > 0 && nodeStack[level - 1]) {
                mermaidCode += `    ${nodeStack[level - 1]} --> ${nodeId}\n`;
            }

            // 스택 업데이트
            nodeStack[level] = nodeId;
        });

        return mermaidCode;
    }
};

// 전역으로 노출
window.AIMermaidConverter = AIMermaidConverter;
