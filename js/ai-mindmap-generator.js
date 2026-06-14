// Mermaid 코드를 실제 마인드맵 노드로 변환하는 엔진

const AIMindmapGenerator = {
    /**
     * 텍스트를 AI로 분석하여 마인드맵 생성
     * @param {string} text - 사용자 입력 텍스트
     * @param {Function} progressCallback - 진행 상황 콜백
     */
    async generateFromText(text, progressCallback = null) {
        try {
            // 1단계: AI로 Mermaid 코드 생성
            if (progressCallback) progressCallback('AI가 구조를 분석하고 있습니다...');
            const result = await AIMermaidConverter.textToMermaid(text);
            
            // 결과가 객체인지 문자열인지 확인 (하위 호환성)
            const mermaidCode = typeof result === 'string' ? result : result.mermaidCode;
            const nodeContents = typeof result === 'string' ? {} : (result.nodeContents || {});

            // 2단계: Mermaid 코드 검증
            if (!MermaidParser.isValid(mermaidCode)) {
                throw new Error('생성된 Mermaid 코드가 유효하지 않습니다.');
            }

            // 3단계: Mermaid 파싱
            if (progressCallback) progressCallback('노드와 연결을 생성하고 있습니다...');
            const { nodes: mermaidNodes, links: mermaidLinks } = MermaidParser.parse(mermaidCode);

            if (mermaidNodes.length === 0) {
                throw new Error('노드를 찾을 수 없습니다.');
            }

            // 4단계: 마인드맵 생성 (노드 본문 정보 포함)
            if (progressCallback) progressCallback('마인드맵을 그리고 있습니다...');
            await this.createMindmap(mermaidNodes, mermaidLinks, nodeContents);

            if (progressCallback) progressCallback('완료!');

            console.log('✅ AI 마인드맵 생성 완료');

        } catch (error) {
            console.error('❌ 마인드맵 생성 실패:', error);
            throw error;
        }
    },

    /**
     * Mermaid 노드/링크 데이터를 실제 마인드맵으로 변환
     * @param {Array} mermaidNodes - Mermaid 노드 배열
     * @param {Array} mermaidLinks - Mermaid 링크 배열
     * @param {Object} nodeContents - 노드 ID를 키로 하는 본문 정보 객체 (선택사항)
     */
    async createMindmap(mermaidNodes, mermaidLinks, nodeContents = {}) {
        console.log('🆕 마인드맵 생성 시작 - 현재 캔버스에서 작업');

        // 1. 현재 활성 캔버스 ID 가져오기 (새 탭 생성하지 않음)
        let canvasId = null;
        if (window.canvasTabManager && typeof window.canvasTabManager.getCurrentCanvasId === 'function') {
            canvasId = window.canvasTabManager.getCurrentCanvasId();
        }

        // 현재 캔버스가 없으면 기본값 사용
        if (!canvasId) {
            canvasId = 'canvas1';
        }

        console.log(`📋 현재 캔버스 ID: ${canvasId}`);

        // 2. 노드 위치 계산 (트리 레이아웃)
        const positions = this.calculateTreeLayout(mermaidNodes, mermaidLinks);

        // 3. Mermaid ID → 실제 노드 매핑
        const nodeMap = new Map();

        // HTML 태그 제거 함수
        const stripHtmlTags = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.textContent || div.innerText || '';
        };

        // 4. 실제 노드 생성 및 Firebase 저장
        for (let index = 0; index < mermaidNodes.length; index++) {
            const mNode = mermaidNodes[index];
            const pos = positions[index];

            // HTML 태그 제거
            const cleanTitle = stripHtmlTags(mNode.title);

            // 이모지 추가 (내용 기반)
            const emoji = this.getEmojiForNode(cleanTitle);
            const titleWithEmoji = emoji ? `${emoji} ${cleanTitle}` : cleanTitle;

            // 깊이에 따른 색상
            const emotionColor = this.getColorByDepth(pos.depth);
            const borderColor = this.getBorderColorByDepth(pos.depth);

            // 노드 본문 정보 가져오기 (nodeContents 객체에서)
            const nodeContent = nodeContents[mNode.id] || '';

            const now = new Date();
            const node = {
                id: Date.now() + index,  // 고유 ID 생성
                title: titleWithEmoji,
                content: nodeContent,  // AI가 제공한 노드 본문 정보
                date: now.toISOString().split('T')[0],
                x: pos.x,
                y: pos.y,
                baseX: pos.x,  // 플로팅 애니메이션을 위한 기본 위치
                baseY: pos.y,
                phase: Math.random() * Math.PI * 2,  // 플로팅 페이즈
                emotion: emotionColor,  // 폰트 색상
                titleColor: emotionColor,  // 폰트 색상 명시적 설정
                borderColor: borderColor,  // 테두리 색상 (계층별)
                aiGenerated: true,  // AI 생성 노드 표시
                depth: pos.depth,  // 계층 깊이 저장
                folder: '/',
                canvasId: canvasId,
                vx: 0,
                vy: 0,
                mass: 1,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            nodes.push(node);
            nodeMap.set(mNode.id, node);

            // Firebase에 개별 노드 저장
            if (typeof FirebaseManager !== 'undefined' && FirebaseManager.saveNode) {
                try {
                    await FirebaseManager.saveNode(node);
                } catch (error) {
                    console.warn('Firebase 저장 실패 (계속 진행):', error);
                }
            }

            console.log(`📍 노드 생성: ${mNode.id} → ${node.title} (${pos.x}, ${pos.y})`);
            if (nodeContent) {
                console.log(`📝 노드 본문: ${nodeContent.substring(0, 50)}...`);
            }
        }

        // 5. 링크 생성 (Mermaid 화살표 → 실제 선 연결)
        mermaidLinks.forEach(link => {
            const fromNode = nodeMap.get(link.from);
            const toNode = nodeMap.get(link.to);

            if (fromNode && toNode) {
                links.push({
                    source: fromNode.id,  // drawLinks()가 찾는 속성명
                    target: toNode.id     // drawLinks()가 찾는 속성명
                });

                console.log(`🔗 링크 생성: ${link.from} → ${link.to} (${fromNode.id} → ${toNode.id})`);
            }
        });

        // 6. 렌더링
        if (typeof render === 'function') {
            render();
        }

        // 7. 캔버스 데이터 저장
        if (typeof window.canvasTabManager !== 'undefined' && window.canvasTabManager.saveCanvasData) {
            try {
                await window.canvasTabManager.saveCanvasData();
            } catch (error) {
                console.warn('캔버스 데이터 저장 실패 (계속 진행):', error);
            }
        }

        console.log(`✅ 마인드맵 생성 완료: 노드 ${mermaidNodes.length}개, 링크 ${mermaidLinks.length}개`);

        // 8. JSON 형식으로 데이터 저장 및 출력
        this.exportToJSON(mermaidNodes, mermaidLinks, nodeMap, canvasId);
    },

    /**
     * 마인드맵 데이터를 JSON 형식으로 내보내기
     * @param {Array} mermaidNodes - Mermaid 노드 배열
     * @param {Array} mermaidLinks - Mermaid 링크 배열
     * @param {Map} nodeMap - Mermaid ID → 실제 노드 매핑
     * @param {string} canvasId - 캔버스 ID
     */
    exportToJSON(mermaidNodes, mermaidLinks, nodeMap, canvasId) {
        try {
            // 1. Mermaid 원본 데이터
            const mermaidData = {
                nodes: mermaidNodes.map(n => ({
                    id: n.id,
                    title: n.title
                })),
                links: mermaidLinks.map(l => ({
                    from: l.from,
                    to: l.to
                }))
            };

            // 2. 실제 노드 데이터
            const nodeData = Array.from(nodeMap.values()).map(node => ({
                id: node.id,
                title: node.title,
                content: node.content,
                x: node.x,
                y: node.y,
                emotion: node.emotion,
                date: node.date,
                folder: node.folder,
                canvasId: node.canvasId
            }));

            // 3. 링크 데이터 (실제 노드 ID로 변환)
            const linkData = mermaidLinks.map(link => {
                const fromNode = nodeMap.get(link.from);
                const toNode = nodeMap.get(link.to);
                if (fromNode && toNode) {
                    return {
                        from: fromNode.id,
                        to: toNode.id,
                        fromTitle: fromNode.title,
                        toTitle: toNode.title
                    };
                }
                return null;
            }).filter(link => link !== null);

            // 4. 전체 JSON 구조
            const exportData = {
                version: '1.0',
                createdAt: new Date().toISOString(),
                canvasId: canvasId,
                metadata: {
                    nodeCount: nodeData.length,
                    linkCount: linkData.length,
                    source: 'AI Generated Mindmap'
                },
                mermaid: mermaidData,
                nodes: nodeData,
                links: linkData,
                structure: this.buildTreeStructure(mermaidNodes, mermaidLinks, nodeMap)
            };

            // 5. 콘솔에 출력
            console.log('📄 마인드맵 JSON 데이터:', JSON.stringify(exportData, null, 2));

            // 6. 전역 변수에 저장 (다운로드용)
            window.lastMindmapJSON = exportData;

            // 7. localStorage에 저장 (선택적)
            try {
                const savedMindmaps = JSON.parse(localStorage.getItem('savedMindmaps') || '[]');
                savedMindmaps.push({
                    timestamp: exportData.createdAt,
                    canvasId: canvasId,
                    data: exportData
                });
                // 최대 10개만 저장
                if (savedMindmaps.length > 10) {
                    savedMindmaps.shift();
                }
                localStorage.setItem('savedMindmaps', JSON.stringify(savedMindmaps));
                console.log('💾 마인드맵 JSON이 localStorage에 저장되었습니다.');
            } catch (error) {
                console.warn('localStorage 저장 실패:', error);
            }

            // 8. 다운로드 버튼 표시 (선택적)
            this.showDownloadButton(exportData);

        } catch (error) {
            console.error('JSON 내보내기 실패:', error);
        }
    },

    /**
     * 트리 구조 생성 (계층적 표현)
     */
    buildTreeStructure(mermaidNodes, mermaidLinks, nodeMap) {
        const structure = {
            root: null,
            children: {}
        };

        // 루트 노드 찾기
        const hasIncoming = new Set();
        mermaidLinks.forEach(link => hasIncoming.add(link.to));
        const rootNode = mermaidNodes.find(node => !hasIncoming.has(node.id));

        if (rootNode) {
            const rootActualNode = nodeMap.get(rootNode.id);
            structure.root = rootActualNode ? rootActualNode.id : null;
        }

        // 자식 관계 구축
        mermaidLinks.forEach(link => {
            const fromNode = nodeMap.get(link.from);
            const toNode = nodeMap.get(link.to);
            
            if (fromNode && toNode) {
                if (!structure.children[fromNode.id]) {
                    structure.children[fromNode.id] = [];
                }
                structure.children[fromNode.id].push({
                    nodeId: toNode.id,
                    title: toNode.title
                });
            }
        });

        return structure;
    },

    /**
     * JSON 다운로드 버튼 표시
     */
    showDownloadButton(exportData) {
        // 기존 버튼 제거
        const existingBtn = document.getElementById('download-mindmap-json');
        if (existingBtn) {
            existingBtn.remove();
        }

        // 새 버튼 생성
        const btn = document.createElement('button');
        btn.id = 'download-mindmap-json';
        btn.textContent = '📥 JSON 다운로드';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #4ECDC4;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        btn.onclick = () => {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mindmap_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('✅ JSON 파일 다운로드 완료');
        };

        document.body.appendChild(btn);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (btn.parentNode) {
                btn.remove();
            }
        }, 10000);
    },

    /**
     * 트리 레이아웃 계산 (계층적 배치)
     * @param {Array} nodes - 노드 배열
     * @param {Array} links - 링크 배열
     * @returns {Array} 위치 정보 배열
     */
    calculateTreeLayout(nodes, links) {
        // 루트 노드 찾기 (들어오는 링크가 없는 노드)
        const hasIncoming = new Set();
        links.forEach(link => hasIncoming.add(link.to));

        const rootNode = nodes.find(node => !hasIncoming.has(node.id));
        const rootId = rootNode ? rootNode.id : nodes[0].id;

        console.log('🌳 루트 노드:', rootId);

        // BFS로 레벨별 노드 분류
        const levels = this.groupNodesByLevel(nodes, links, rootId);

        // 위치 계산
        const positions = [];
        const horizontalSpacing = 180;  // 같은 레벨 내 노드 간 간격 (300 → 180으로 축소)
        const verticalSpacing = 150;     // 레벨 간 간격 (250 → 150으로 축소)

        nodes.forEach(node => {
            const levelInfo = levels.get(node.id);
            const level = levelInfo ? levelInfo.depth : 0;
            const indexInLevel = levelInfo ? levelInfo.indexInLevel : 0;
            const totalInLevel = levelInfo ? levelInfo.totalInLevel : 1;

            // 중앙 정렬을 위한 오프셋 계산
            const levelWidth = (totalInLevel - 1) * horizontalSpacing;
            const startX = -levelWidth / 2;

            const x = startX + (indexInLevel * horizontalSpacing);
            const y = level * verticalSpacing;

            positions.push({
                x: x,
                y: y,
                depth: level
            });
        });

        return positions;
    },

    /**
     * BFS로 노드를 레벨별로 그룹화
     * @param {Array} nodes - 노드 배열
     * @param {Array} links - 링크 배열
     * @param {string} rootId - 루트 노드 ID
     * @returns {Map} 노드 ID → 레벨 정보 매핑
     */
    groupNodesByLevel(nodes, links, rootId) {
        const levels = new Map();
        const visited = new Set();
        const queue = [{ id: rootId, depth: 0 }];

        // 각 레벨의 노드 개수 추적
        const levelCounts = new Map();

        while (queue.length > 0) {
            const { id, depth } = queue.shift();

            if (visited.has(id)) continue;
            visited.add(id);

            // 이 레벨의 노드 인덱스
            const indexInLevel = levelCounts.get(depth) || 0;
            levelCounts.set(depth, indexInLevel + 1);

            levels.set(id, {
                depth: depth,
                indexInLevel: indexInLevel,
                totalInLevel: 0  // 나중에 업데이트
            });

            // 자식 노드들을 큐에 추가
            const children = links.filter(link => link.from === id);
            children.forEach(link => {
                if (!visited.has(link.to)) {
                    queue.push({ id: link.to, depth: depth + 1 });
                }
            });
        }

        // totalInLevel 업데이트
        levels.forEach((info, id) => {
            info.totalInLevel = levelCounts.get(info.depth) || 1;
        });

        return levels;
    },

    /**
     * 깊이에 따른 색상 할당 (그라데이션 효과)
     * @param {number} depth - 노드 깊이
     * @returns {string} 색상 코드
     */
    getColorByDepth(depth) {
        // 보라색/파란색 계열 그라데이션 (우주 테마)
        const colors = [
            '#FFD700',  // 골드 (레벨 0 - 루트)
            '#FF6B9D',  // 핑크 (레벨 1)
            '#C084FC',  // 보라 (레벨 2)
            '#60A5FA',  // 파랑 (레벨 3)
            '#34D399',  // 민트 (레벨 4)
            '#FBBF24',  // 노랑 (레벨 5)
            '#F472B6',  // 연핑크 (레벨 6)
        ];

        return colors[depth % colors.length];
    },

    /**
     * 깊이에 따른 테두리 색상 할당 (폴더 색상 대신 사용)
     * @param {number} depth - 노드 깊이
     * @returns {string} 색상 코드
     */
    getBorderColorByDepth(depth) {
        // 계층별 테두리 색상 - 명확하게 구분되는 색상
        const colors = [
            '#FFD700',  // 골드 (레벨 0 - 루트)
            '#FF6B6B',  // 빨강/코랄 (레벨 1)
            '#9B59B6',  // 보라 (레벨 2)
            '#3498DB',  // 파랑 (레벨 3)
            '#2ECC71',  // 초록 (레벨 4)
            '#E91E63',  // 핑크 (레벨 5)
            '#00BCD4',  // 시안 (레벨 6)
        ];

        const color = colors[depth % colors.length];
        console.log(`🎨 테두리 색상: depth=${depth}, color=${color}`);
        return color;
    },

    /**
     * 노드 제목에 맞는 이모지 반환
     * @param {string} title - 노드 제목
     * @returns {string} 이모지 또는 빈 문자열
     */
    getEmojiForNode(title) {
        if (!title) return '';

        const titleLower = title.toLowerCase();

        // 카테고리별 이모지 매핑 (확장)
        const emojiMap = [
            // 기술/개발
            { keywords: ['개발', '코드', '프로그래밍', '소프트웨어', 'software', 'code', 'develop'], emoji: '💻' },
            { keywords: ['앱', '어플', 'app', 'application', '모바일'], emoji: '📱' },
            { keywords: ['웹', 'web', '사이트', 'site', '홈페이지'], emoji: '🌐' },
            { keywords: ['api', '인터페이스', 'interface'], emoji: '🔌' },
            { keywords: ['데이터', '데이터베이스', 'db', 'sql', 'database'], emoji: '💾' },
            { keywords: ['ai', '인공지능', '머신러닝', '딥러닝', 'machine', 'learning'], emoji: '🤖' },
            { keywords: ['보안', '암호화', '해킹', 'security'], emoji: '🔒' },
            { keywords: ['서버', 'server', '클라우드', 'cloud'], emoji: '☁️' },
            { keywords: ['네트워크', 'network', '인터넷'], emoji: '🔗' },
            { keywords: ['테스트', 'test', '검증', 'qa'], emoji: '🧪' },
            { keywords: ['배포', 'deploy', '릴리즈', 'release'], emoji: '🚀' },
            { keywords: ['버그', 'bug', '오류', 'error', '에러'], emoji: '🐛' },
            { keywords: ['디자인', 'design', 'ui', 'ux'], emoji: '🎨' },
            { keywords: ['문서', 'document', '문서화', 'docs'], emoji: '📄' },

            // 비즈니스/경영
            { keywords: ['비즈니스', '경영', '전략', '기획', 'business', 'strategy'], emoji: '📊' },
            { keywords: ['마케팅', '광고', '홍보', 'marketing'], emoji: '📢' },
            { keywords: ['재무', '금융', '투자', '주식', 'finance', 'money'], emoji: '💰' },
            { keywords: ['프로젝트', '관리', 'project', 'management'], emoji: '📋' },
            { keywords: ['일정', '스케줄', 'schedule', '캘린더'], emoji: '📅' },
            { keywords: ['회의', '미팅', 'meeting'], emoji: '🤝' },
            { keywords: ['계약', '협약', 'contract'], emoji: '📝' },
            { keywords: ['고객', '클라이언트', 'customer', 'client'], emoji: '👤' },
            { keywords: ['팀', 'team', '조직', '부서'], emoji: '👥' },
            { keywords: ['리더', '리더십', 'leader', 'ceo'], emoji: '👔' },
            { keywords: ['성장', 'growth', '확장', 'expand'], emoji: '📈' },
            { keywords: ['수익', '매출', 'revenue', 'sales'], emoji: '💵' },
            { keywords: ['비용', '예산', 'budget', 'cost'], emoji: '💳' },

            // 학습/교육
            { keywords: ['학습', '교육', '수업', '강의', 'education', 'learning'], emoji: '📚' },
            { keywords: ['연구', '조사', '분석', 'research', 'analysis'], emoji: '🔬' },
            { keywords: ['시험', '테스트', '평가', 'exam'], emoji: '📝' },
            { keywords: ['학교', '대학', 'school', 'university'], emoji: '🏫' },
            { keywords: ['졸업', '학위', 'graduate', 'degree'], emoji: '🎓' },
            { keywords: ['책', 'book', '읽기', 'read'], emoji: '📖' },
            { keywords: ['언어', 'language', '영어', '한국어'], emoji: '🗣️' },

            // 생활/일상
            { keywords: ['건강', '운동', '다이어트', 'health', 'fitness'], emoji: '💪' },
            { keywords: ['음식', '요리', '식사', 'food', 'cook'], emoji: '🍽️' },
            { keywords: ['여행', '휴가', 'travel', 'vacation'], emoji: '✈️' },
            { keywords: ['집', '홈', 'home', 'house'], emoji: '🏠' },
            { keywords: ['취미', '게임', 'hobby', 'game'], emoji: '🎮' },
            { keywords: ['음악', 'music', '노래', 'song'], emoji: '🎵' },
            { keywords: ['영화', 'movie', '드라마', '영상'], emoji: '🎬' },
            { keywords: ['쇼핑', 'shopping', '구매', 'buy'], emoji: '🛒' },
            { keywords: ['패션', 'fashion', '옷', '스타일'], emoji: '👗' },
            { keywords: ['자동차', 'car', '운전', 'drive'], emoji: '🚗' },
            { keywords: ['휴식', 'rest', '수면', 'sleep'], emoji: '😴' },

            // 감정/관계
            { keywords: ['친구', 'friend', '우정'], emoji: '🤗' },
            { keywords: ['가족', 'family', '부모', '자녀'], emoji: '👨‍👩‍👧‍👦' },
            { keywords: ['사랑', '연애', 'love', '커플'], emoji: '❤️' },
            { keywords: ['기쁨', '행복', 'happy', 'joy'], emoji: '😊' },
            { keywords: ['슬픔', '우울', 'sad'], emoji: '😢' },
            { keywords: ['화', '분노', 'angry'], emoji: '😠' },
            { keywords: ['두려움', '공포', 'fear'], emoji: '😨' },

            // 목표/계획
            { keywords: ['목표', 'goal', '목적', 'objective'], emoji: '🎯' },
            { keywords: ['성공', '달성', 'success', 'achieve'], emoji: '🏆' },
            { keywords: ['완료', 'complete', 'done', '끝'], emoji: '✅' },
            { keywords: ['진행', 'progress', '진행중'], emoji: '⏳' },
            { keywords: ['시작', 'start', 'begin', '시작점'], emoji: '🚦' },
            { keywords: ['도전', 'challenge', '시도'], emoji: '🔥' },

            // 일반/기타
            { keywords: ['중요', '핵심', 'important', 'key', 'main'], emoji: '⭐' },
            { keywords: ['주의', 'warning', '경고'], emoji: '⚠️' },
            { keywords: ['해결', '솔루션', 'solution', 'solve'], emoji: '💡' },
            { keywords: ['아이디어', 'idea', '생각'], emoji: '💭' },
            { keywords: ['정보', 'info', 'information'], emoji: 'ℹ️' },
            { keywords: ['질문', 'question', '의문'], emoji: '❓' },
            { keywords: ['답변', 'answer', '응답'], emoji: '💬' },
            { keywords: ['리스트', 'list', '목록'], emoji: '📋' },
            { keywords: ['설정', 'setting', '설정', 'config'], emoji: '⚙️' },
            { keywords: ['알림', 'notification', '공지'], emoji: '🔔' },
            { keywords: ['시간', 'time', '기간'], emoji: '⏰' },
            { keywords: ['위치', 'location', '장소', 'place'], emoji: '📍' },
            { keywords: ['파일', 'file', '자료'], emoji: '📁' },
            { keywords: ['이미지', 'image', '사진', 'photo'], emoji: '🖼️' },
            { keywords: ['링크', 'link', 'url', '연결'], emoji: '🔗' },
            { keywords: ['검색', 'search', '찾기'], emoji: '🔍' },
            { keywords: ['필터', 'filter', '분류'], emoji: '🔽' },
            { keywords: ['추가', 'add', '새로운', 'new'], emoji: '➕' },
            { keywords: ['삭제', 'delete', 'remove'], emoji: '🗑️' },
            { keywords: ['수정', 'edit', '편집', 'modify'], emoji: '✏️' },
            { keywords: ['복사', 'copy', '복제'], emoji: '📋' },
            { keywords: ['저장', 'save', '보관'], emoji: '💾' },
            { keywords: ['전송', 'send', '보내기'], emoji: '📤' },
            { keywords: ['받기', 'receive', '수신'], emoji: '📥' },
            { keywords: ['공유', 'share', '나누기'], emoji: '🔄' },

            // 자연/환경
            { keywords: ['날씨', 'weather', '기후'], emoji: '🌤️' },
            { keywords: ['환경', 'environment', '자연', 'nature'], emoji: '🌿' },
            { keywords: ['동물', 'animal', '반려동물', 'pet'], emoji: '🐾' },
            { keywords: ['식물', 'plant', '꽃', 'flower'], emoji: '🌸' },
        ];

        // 키워드 매칭
        for (const { keywords, emoji } of emojiMap) {
            if (keywords.some(keyword => titleLower.includes(keyword))) {
                return emoji;
            }
        }

        // 기본 이모지 (제목의 첫 글자 기반으로 다양화)
        const defaultEmojis = ['🌟', '✨', '💫', '⭐', '🔆', '💎', '🎪', '🎭', '🎨', '🌈'];
        const charCode = title.charCodeAt(0) || 0;
        return defaultEmojis[charCode % defaultEmojis.length];
    }
};

// 전역으로 노출
window.AIMindmapGenerator = AIMindmapGenerator;
