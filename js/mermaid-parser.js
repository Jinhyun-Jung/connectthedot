// Mermaid 다이어그램 파서
// Mermaid 코드를 파싱하여 노드와 링크 정보를 추출

const MermaidParser = {
    /**
     * Mermaid graph 코드를 파싱하여 노드와 링크 추출
     * @param {string} mermaidText - Mermaid graph TD 코드
     * @returns {{nodes: Array, links: Array}} 노드 및 링크 배열
     */
    parse(mermaidText) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map(); // 중복 방지

        // 줄 단위로 분리
        const lines = mermaidText.split('\n').map(line => line.trim());

        // 노드 추출 정규식 패턴들
        const patterns = {
            // A[텍스트] 형태
            square: /([A-Z]\d*)\[([^\]]+)\]/g,
            // A(텍스트) 형태
            round: /([A-Z]\d*)\(([^\)]+)\)/g,
            // A{텍스트} 형태
            rhombus: /([A-Z]\d*)\{([^\}]+)\}/g,
            // A((텍스트)) 형태
            circle: /([A-Z]\d*)\\(\(([^\)]+)\\)\)/g
        };

        // 모든 패턴으로 노드 추출
        lines.forEach(line => {
            Object.values(patterns).forEach(pattern => {
                let match;
                const regex = new RegExp(pattern.source, 'g');

                while ((match = regex.exec(line)) !== null) {
                    const id = match[1];
                    const title = match[2];

                    if (!nodeMap.has(id)) {
                        nodeMap.set(id, {
                            id: id,
                            title: title.trim()
                        });
                    }
                }
            });
        });

        // 링크 추출 패턴들
        const linkPatterns = [
            // A --> B (화살표)
            /([A-Z]\d*)\s*-->\s*([A-Z]\d*)/g,
            // A --- B (선)
            /([A-Z]\d*)\s*---\s*([A-Z]\d*)/g,
            // A -- 텍스트 --> B (레이블 있는 화살표)
            /([A-Z]\d*)\s*--\s*[^-]+\s*-->\s*([A-Z]\d*)/g,
            // A -.- B (점선)
            /([A-Z]\d*)\s*-\.-\s*([A-Z]\d*)/g
        ];

        // 모든 패턴으로 링크 추출
        lines.forEach(line => {
            linkPatterns.forEach(pattern => {
                let match;
                const regex = new RegExp(pattern.source, 'g');

                while ((match = regex.exec(line)) !== null) {
                    const from = match[1];
                    const to = match[2];

                    // 노드가 존재하는 경우만 링크 추가
                    if (nodeMap.has(from) && nodeMap.has(to)) {
                        links.push({
                            from: from,
                            to: to
                        });
                    }
                }
            });
        });

        // Map을 배열로 변환
        nodes.push(...nodeMap.values());

        console.log('📊 Mermaid 파싱 결과:', {
            nodeCount: nodes.length,
            linkCount: links.length,
            nodes: nodes,
            links: links
        });

        return { nodes, links };
    },

    /**
     * 간단한 유효성 검사
     * @param {string} mermaidText - Mermaid 코드
     * @returns {boolean} 유효 여부
     */
    isValid(mermaidText) {
        if (!mermaidText || typeof mermaidText !== 'string') {
            return false;
        }

        // graph TD 또는 graph LR 선언이 있는지 확인
        const hasGraphDeclaration = /graph\s+(TD|LR|TB|RL)/i.test(mermaidText);

        // 최소 1개의 노드가 있는지 확인
        const hasNodes = /[A-Z]\d*[\[\(\{]/.test(mermaidText);

        return hasGraphDeclaration && hasNodes;
    },

    /**
     * Mermaid 코드에서 그래프 방향 추출
     * @param {string} mermaidText - Mermaid 코드
     * @returns {string} 방향 (TD, LR, TB, RL)
     */
    getDirection(mermaidText) {
        const match = mermaidText.match(/graph\s+(TD|LR|TB|RL)/i);
        return match ? match[1].toUpperCase() : 'TD';
    }
};

// 전역으로 노출
window.MermaidParser = MermaidParser;
