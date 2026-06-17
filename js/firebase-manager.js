// Firebase Manager v11+ 모듈
// 
// Firebase v11+ 모듈 방식으로 앱의 인증 및 데이터베이스를 관리합니다.
// 동적 import를 통해 필요한 Firebase 모듈들을 로드하며,
// FirebaseManager 객체를 통해 노드 저장/로드, 인증 등의 기능을 제공합니다.
// 
// 주요 기능:
// - Firebase 앱 초기화 및 서비스 인스턴스 관리
// - 사용자 인증 (로그인/회원가입/로그아웃/익명 로그인)
// - 노드 데이터 CRUD 및 실시간 동기화
// - 인증 상태 변화에 따른 UI 업데이트

console.log('Firebase Manager v11+ - 앱 인증 및 데이터베이스 관리');

// Firebase 구성 (변경없음)
const firebaseConfig = {
    apiKey: "AIzaSyA80ERs8PERZJHE19423dhpe8Qm9gGv_aw",
    authDomain: "note-e40bb.firebaseapp.com",
    projectId: "note-e40bb",
    storageBucket: "note-e40bb.appspot.com",
    messagingSenderId: "646886527637",
    appId: "1:646886527637:web:31aa9d7fa416e37c3b819c",
    measurementId: "G-QG9MYR7Q4H"
};

// Firebase 앱 및 서비스 인스턴스 전역 변수
let app = null;
let auth = null;
let db = null;

// Firebase 초기화 함수 (모던 API)
async function initializeFirebase() {
    try {
        // 동적 임포트로 Firebase 모듈 가져오기
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
        
        // Firebase 앱 초기화
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        console.log('Firebase v11 초기화 완료');
        
        return { app, auth, db };
    } catch (error) {
        console.error('Firebase 초기화 실패:', error);
        throw error;
    }
}

// Firebase 데이터 관리를 위한 객체 (v11 API로 업데이트)
const FirebaseManager = {
    unsubscribe: null, // 실시간 리스너 정리용
    
    // 실시간 리스너 관리를 위한 변수
    realtimeListener: null,
    
    // 노드 저장 (v11 문법) - 캔버스별 저장 지원
    saveNode: async function (node) {
        // 빈 노드 검증 - 제목과 ID가 유효하지 않으면 저장하지 않음
        if (!node) {
            console.error('노드가 null 또는 undefined입니다.');
            return;
        }

        if (!node.title || node.title.trim() === '') {
            console.error('제목이 없는 노드는 저장하지 않습니다:', node);
            return;
        }

        if (!node.id || isNaN(node.id) || node.id === null || node.id === undefined) {
            console.error('유효하지 않은 노드 ID입니다:', node.id, typeof node.id);
            return;
        }

        if (!auth?.currentUser) {
            console.error('사용자가 로그인되지 않아 저장할 수 없습니다.');
            throw new Error('로그인이 필요합니다.');
        }

        try {
            // 동적 임포트로 필요한 Firestore 함수들 가져오기
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            
            // 현재 활성 캔버스 ID 가져오기
            const currentCanvasId = window.canvasTabManager ? 
                window.canvasTabManager.getCurrentCanvasId() : 'canvas1';
            
            const nodeData = {
                userId: user.uid,
                canvasId: currentCanvasId, // 캔버스 ID 추가
                title: node.title || '',
                content: node.content || '',
                x: node.x || 0,
                y: node.y || 0,
                baseX: node.baseX || node.x || 0,
                baseY: node.baseY || node.y || 0,
                folder: node.folder || '/',
                emotion: node.emotion || 'default',
                id: node.id,
                isFolder: !!node.isFolder,
                isSpreadsheet: !!node.isSpreadsheet,
                date: node.date || null,
                checked: !!node.checked,
                vx: node.vx || 0,
                vy: node.vy || 0,
                mass: node.mass || 1,
                phase: node.phase || Math.random() * Math.PI * 2,
                style: node.style || {},
                spreadsheetData: node.spreadsheetData || null,
                // AI 생성 노드 관련 필드
                borderColor: node.borderColor || null,
                titleColor: node.titleColor || null,
                depth: node.depth !== undefined ? node.depth : null,
                aiGenerated: !!node.aiGenerated
            };

            if (node.isFolder) {
                nodeData.folderPath = node.folderPath || node.folder || '/';
            }

            // v11 방식으로 문서 저장
            const nodeRef = doc(db, 'nodes', node.id.toString());
            await setDoc(nodeRef, nodeData);
            
            console.log('노드가 저장되었습니다:', node.id);

            // 중복 로컬 배열 업데이트 제거 (실시간 리스너가 처리함)
            // const existingNodeIndex = nodes.findIndex(n => n.id === node.id);
            // if (existingNodeIndex !== -1) {
            //     nodes[existingNodeIndex] = { ...node };
            // } else {
            //     nodes.push({ ...node });
            // }

        } catch (error) {
            console.error('노드 저장 중 오류 발생:', error);
            throw error;
        }
    },

    // 노드 로드 및 실시간 업데이트 (v11 문법) - 캔버스별 로드 지원
    loadNodes: async function (canvasId = null) {
        if (!auth?.currentUser) {
            console.warn('사용자가 로그인되지 않아 노드를 로드할 수 없습니다.');
            return [];
        }

        try {
            // 동적 임포트로 필요한 Firestore 함수들 가져오기
            const { collection, query, where, getDocs, onSnapshot } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            
            // 현재 활성 캔버스 ID 가져오기
            const targetCanvasId = canvasId || (window.canvasTabManager ? 
                window.canvasTabManager.getCurrentCanvasId() : 'canvas1');
                
            console.log('노드 로드 시작 - 사용자:', user.email, '캔버스:', targetCanvasId);

            // 기존 리스너 정리
            if (this.realtimeListener) {
                console.log('기존 실시간 리스너 정리');
                this.realtimeListener();
                this.realtimeListener = null;
            }

            // 먼저 기존 노드들(canvasId가 없는 노드들)을 마이그레이션
            await this.migrateExistingNodes(targetCanvasId, user.uid);

            // 쿼리 생성 - 캔버스별 필터링 추가
            const q = query(
                collection(db, 'nodes'),
                where('userId', '==', user.uid),
                where('canvasId', '==', targetCanvasId)
            );

            console.log('=== FIREBASE 단일 리스너 방식으로 로드 시작 ===');
            
            // 초기화
            window.nodes = [];
            if (typeof nodes !== 'undefined') {
                nodes.length = 0;
            }
            
            // initialNodes 변수 선언 (반환용)
            let initialNodes = [];
            
            // onSnapshot만 사용하여 초기 로드와 실시간 업데이트를 모두 처리
            let isFirstLoad = true;
            this.realtimeListener = onSnapshot(q, (snapshot) => {
                if (isFirstLoad || snapshot.size === 0) {
                    console.log('Firebase 스냅샷 수신:', snapshot.size, '개 문서', '첫 로드:', isFirstLoad);
                }
                
                if (isFirstLoad) {
                    // 첫 번째 로드: 모든 문서를 초기 데이터로 처리
                    const allNodes = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        
                        // ID 파싱
                        let nodeId;
                        try {
                            const docId = doc.id;
                            if (docId && docId !== 'undefined' && docId !== 'null' && docId !== 'NaN') {
                                nodeId = parseFloat(docId);
                                if (isNaN(nodeId)) {
                                    console.error('잘못된 document ID:', docId);
                                    return;
                                }
                            } else {
                                console.error('유효하지 않은 document ID:', docId);
                                return;
                            }
                        } catch (error) {
                            console.error('document ID 파싱 오류:', doc.id, error);
                            return;
                        }
                        
                        allNodes.push({
                            ...data,
                            id: nodeId
                        });
                    });
                    
                    console.log('초기 로드 완료:', allNodes.length, '개 노드');
                    
                    // 전역 배열에 설정
                    window.nodes = allNodes;
                    if (typeof nodes !== 'undefined') {
                        nodes.length = 0;
                        nodes.push(...allNodes);
                    }
                    
                    // 물리 속성 추가
                    allNodes.forEach(node => {
                        if (!node.phase) node.phase = Math.random() * Math.PI * 2;
                        if (!node.vx) node.vx = 0;
                        if (!node.vy) node.vy = 0;
                        if (!node.mass) node.mass = 1;
                    });
                    
                    // UI 업데이트
                    setTimeout(() => {
                        if (typeof render === 'function') {
                            render();
                            console.log('첫 번째 렌더링 완료');
                        }
                        if (typeof renderCalendar === 'function') {
                            renderCalendar();
                        }
                        if (typeof renderFolderTree === 'function') {
                            renderFolderTree();
                        }
                        if (typeof updateFolderButtons === 'function') {
                            updateFolderButtons();
                        }
                        
                        // 애니메이션 시작
                        if (window.state && !window.state.animationStarted && allNodes.length > 0) {
                            window.state.animationStarted = true;
                            console.log('Firebase에서 애니메이션 시작 - 노드 수:', allNodes.length);
                            if (typeof updateFloating === 'function') updateFloating();
                        }
                    }, 100);
                    
                    isFirstLoad = false;
                    // initialNodes를 allNodes로 설정하여 반환 가능하게 함
                    initialNodes = allNodes;
                    return;
                }
                
                snapshot.docChanges().forEach((change) => {
                    const docData = change.doc.data();
                    
                    // 현재 활성 캔버스가 아닌 노드는 무시
                    const currentCanvasId = window.canvasTabManager ? 
                        window.canvasTabManager.getCurrentCanvasId() : 'canvas1';
                    
                    // canvasId가 없는 노드는 canvas1에 속하는 것으로 처리
                    const nodeCanvasId = docData.canvasId || 'canvas1';
                    
                    if (nodeCanvasId !== currentCanvasId) {
                        console.log('다른 캔버스의 노드 변경사항 무시:', nodeCanvasId, '!==', currentCanvasId);
                        return;
                    }
                    // nodeId 처리를 더 안전하게
                    let nodeId;
                    try {
                        const docId = change.doc.id;
                        if (docId && docId !== 'undefined' && docId !== 'null' && docId !== 'NaN') {
                            nodeId = parseFloat(docId);
                            // NaN 체크
                            if (isNaN(nodeId)) {
                                console.error('실시간 리스너: 잘못된 document ID:', docId);
                                return; // 이 변경사항은 건너뛰기
                            }
                        } else {
                            console.error('실시간 리스너: 유효하지 않은 document ID:', docId);
                            return; // 이 변경사항은 건너뛰기
                        }
                    } catch (error) {
                        console.error('실시간 리스너: nodeId 파싱 오류:', change.doc.id, error);
                        return;
                    }
                    
                    console.log('실시간 업데이트 처리:', {
                        type: change.type,
                        docId: change.doc.id,
                        parsedNodeId: nodeId,
                        isFolder: docData.isFolder,
                        title: docData.title
                    });
                    
                    // 전역 nodes 배열 직접 접근
                    if (!window.nodes) window.nodes = [];
                    
                    if (change.type === 'added') {
                        // 중복 체크 후 추가
                        const exists = window.nodes.find(n => n.id === nodeId);
                        if (!exists) {
                            const newNode = { ...docData, id: nodeId };
                            window.nodes.push(newNode);
                            console.log('window.nodes에 노드 추가:', nodeId, newNode.isFolder ? '(폴더)' : '(일반)');
                            
                            // node-manager.js의 nodes 배열도 업데이트
                            if (typeof nodes !== 'undefined') {
                                const localExists = nodes.find(n => n.id === nodeId);
                                if (!localExists) {
                                    nodes.push(newNode);
                                    console.log('로컬 nodes에 노드 추가:', nodeId);
                                }
                            }
                        } else {
                            console.log('이미 존재하는 노드 (추가 무시):', nodeId);
                        }
                    } else if (change.type === 'modified') {
                        // 기존 노드 업데이트
                        const index = window.nodes.findIndex(n => n.id === nodeId);
                        if (index !== -1) {
                            const updatedNode = { ...docData, id: nodeId };
                            window.nodes[index] = updatedNode;
                            console.log('window.nodes 노드 수정:', nodeId, updatedNode.isFolder ? '(폴더)' : '(일반)');
                            
                            // node-manager.js의 nodes 배열도 업데이트
                            if (typeof nodes !== 'undefined') {
                                const localIndex = nodes.findIndex(n => n.id === nodeId);
                                if (localIndex !== -1) {
                                    nodes[localIndex] = updatedNode;
                                    console.log('로컬 nodes 노드 수정:', nodeId);
                                }
                            }
                        } else {
                            console.warn('수정할 노드를 찾을 수 없음:', nodeId);
                        }
                    } else if (change.type === 'removed') {
                        // 노드 제거 (중복 제거 방지)
                        console.log('실시간 노드 제거 시작:', nodeId, docData.isFolder ? '(폴더)' : '(일반)');
                        
                        // window.nodes에서 제거
                        if (window.nodes) {
                            const windowIndex = window.nodes.findIndex(n => n.id === nodeId);
                            if (windowIndex !== -1) {
                                window.nodes.splice(windowIndex, 1);
                                console.log('window.nodes에서 노드 제거 완료:', nodeId);
                            } else {
                                console.log('window.nodes에서 노드를 찾을 수 없음:', nodeId);
                            }
                        }
                        
                        // node-manager.js의 nodes 배열에서도 제거
                        if (typeof nodes !== 'undefined' && Array.isArray(nodes)) {
                            const localIndex = nodes.findIndex(n => n.id === nodeId);
                            if (localIndex !== -1) {
                                nodes.splice(localIndex, 1);
                                console.log('로컬 nodes 배열에서 노드 제거 완료:', nodeId);
                            } else {
                                console.log('로컬 nodes 배열에서 노드를 찾을 수 없음:', nodeId);
                            }
                        }
                        
                        // DOM에서도 즉시 제거 (data-id가 string으로 저장되어 있을 수 있음)
                        const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
                        if (nodeElement) {
                            nodeElement.remove();
                            console.log('DOM에서 노드 제거 완료:', nodeId);
                        } else {
                            // string 형태로도 시도
                            const nodeElementStr = document.querySelector(`[data-id="${nodeId.toString()}"]`);
                            if (nodeElementStr) {
                                nodeElementStr.remove();
                                console.log('DOM에서 노드 제거 완료 (string):', nodeId);
                            }
                        }
                        
                        // 링크도 제거
                        if (window.links) {
                            window.links = window.links.filter(link => 
                                link.source !== nodeId && link.target !== nodeId
                            );
                        }
                        if (typeof links !== 'undefined' && Array.isArray(links)) {
                            const beforeLinksCount = links.length;
                            links = links.filter(link => 
                                link.source !== nodeId && link.target !== nodeId
                            );
                            if (beforeLinksCount !== links.length) {
                                console.log('링크 제거 완료, 제거된 링크 수:', beforeLinksCount - links.length);
                            }
                        }
                        
                        console.log('실시간 노드 제거 완료:', nodeId, {
                            windowNodesLength: window.nodes?.length,
                            localNodesLength: nodes?.length
                        });
                    }
                });

                // UI 업데이트
                if (typeof updateLinks === 'function') updateLinks();
                if (typeof render === 'function') render();
                // 폴더뷰도 업데이트
                if (typeof renderFolderTree === 'function') renderFolderTree();
            }, (error) => {
                console.error('실시간 리스너 오류:', error);
            });

            return initialNodes;

        } catch (error) {
            console.error('노드 로드 중 오류 발생:', error);
            return [];
        }
    },

    // 기존 노드들을 canvas1으로 마이그레이션
    migrateExistingNodes: async function(targetCanvasId, userId) {
        try {
            // 마이그레이션은 canvas1에서만 수행
            if (targetCanvasId !== 'canvas1') {
                return;
            }

            console.log('기존 노드 마이그레이션 시작...');
            
            const { collection, query, where, getDocs, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            // canvasId가 없는 노드들을 찾기
            const legacyQuery = query(
                collection(db, 'nodes'),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(legacyQuery);
            let migrationCount = 0;

            const migrationPromises = [];

            querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                
                // canvasId가 없는 노드들만 마이그레이션
                if (!data.canvasId) {
                    console.log('마이그레이션 대상 노드:', docSnapshot.id, data.title);
                    
                    const migrationPromise = updateDoc(doc(db, 'nodes', docSnapshot.id), {
                        canvasId: 'canvas1'
                    }).then(() => {
                        console.log('노드 마이그레이션 완료:', docSnapshot.id);
                    }).catch((error) => {
                        console.error('노드 마이그레이션 실패:', docSnapshot.id, error);
                    });
                    
                    migrationPromises.push(migrationPromise);
                    migrationCount++;
                }
            });

            if (migrationCount > 0) {
                console.log(`${migrationCount}개 노드 마이그레이션 진행 중...`);
                await Promise.all(migrationPromises);
                console.log('모든 노드 마이그레이션 완료');
            } else {
                console.log('마이그레이션할 노드가 없습니다');
            }

        } catch (error) {
            console.error('노드 마이그레이션 중 오류:', error);
        }
    },

    // 노드 삭제 (v11 문법) - 간소화 및 안정성 개선
    deleteNode: async function (nodeId) {
        if (!auth?.currentUser) {
            console.error('사용자가 로그인되지 않아 삭제할 수 없습니다.');
            throw new Error('로그인이 필요합니다.');
        }

        // nodeId 유효성 검사
        if (!nodeId || nodeId === null || nodeId === undefined) {
            console.error('유효하지 않은 nodeId:', nodeId);
            throw new Error('유효하지 않은 노드 ID입니다.');
        }

        try {
            console.log('노드 삭제 시작:', {
                nodeId: nodeId,
                nodeIdType: typeof nodeId,
                userId: auth.currentUser.uid
            });
            
            // 동적 임포트로 필요한 Firestore 함수들 가져오기
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const normalizedNodeId = nodeId.toString();
            const nodeRef = doc(db, 'nodes', normalizedNodeId);
            
            // Firebase에서 삭제 (실시간 리스너가 자동으로 로컬 상태 업데이트)
            await deleteDoc(nodeRef);
            console.log('Firebase에서 노드 삭제 완료:', normalizedNodeId);
            
            // 실시간 리스너가 처리하기 전에 로컬에서도 즉시 제거 (UX 개선)
            const numericNodeId = parseInt(normalizedNodeId);
            
            // window.nodes에서 즉시 제거
            if (window.nodes) {
                const windowIndex = window.nodes.findIndex(n => n.id === numericNodeId);
                if (windowIndex !== -1) {
                    window.nodes.splice(windowIndex, 1);
                    console.log('deleteNode: window.nodes에서 즉시 제거 완료');
                }
            }
            
            // node-manager.js의 nodes 배열에서도 즉시 제거
            if (typeof nodes !== 'undefined' && Array.isArray(nodes)) {
                const localIndex = nodes.findIndex(n => n.id === numericNodeId);
                if (localIndex !== -1) {
                    nodes.splice(localIndex, 1);
                    console.log('deleteNode: 로컬 nodes 배열에서 즉시 제거 완료');
                }
            }
            
            // DOM에서도 즉시 제거
            const nodeElement = document.querySelector(`[data-id="${normalizedNodeId}"]`);
            if (nodeElement) {
                nodeElement.remove();
                console.log('deleteNode: DOM에서 즉시 제거 완료');
            }
            
            // 링크도 즉시 제거
            if (window.links) {
                window.links = window.links.filter(link => 
                    link.source !== numericNodeId && link.target !== numericNodeId
                );
            }
            if (typeof links !== 'undefined' && Array.isArray(links)) {
                links = links.filter(link => 
                    link.source !== numericNodeId && link.target !== numericNodeId
                );
            }
            
            // UI 즉시 업데이트
            if (typeof render === 'function') render();
            if (typeof updateLinks === 'function') updateLinks();
            if (typeof renderFolderTree === 'function') renderFolderTree();
            
        } catch (error) {
            console.error('노드 삭제 중 오류:', {
                nodeId: nodeId,
                error: error.message,
                code: error.code
            });
            throw error;
        }
    },

    // 인증 상태 관찰자 설정 (v11 문법) - 새로운 로그인 UI 연동
    initAuth: async function () {
        try {
            // Firebase 초기화가 안되어 있으면 먼저 초기화
            if (!auth) {
                await initializeFirebase();
            }

            // 새로운 로그인 UI 이벤트 리스너 설정
            this.setupLoginUI();

            // 동적 임포트로 인증 관련 함수들 가져오기
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
            
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // 로그인 상태 - UI 업데이트
                    this.showLoggedInState(user);

                    // 잘못된 ID 노드들 정리 (노드 로드 전에 실행)
                    await this.cleanupInvalidIdNodes();

                    // 빈 노드 정리 (노드 로드 전에 실행)
                    await this.cleanupEmptyNodes();

                    // 노드 데이터 로드
                    const loadedNodes = await this.loadNodes();
                    
                    // 전역 nodes 배열에 할당 (중복 방지)
                    if (loadedNodes && loadedNodes.length > 0) {
                        window.nodes = loadedNodes; // 전역 nodes 배열 업데이트
                        // node-manager.js의 전역 nodes 배열도 동기화
                        if (typeof nodes !== 'undefined') {
                            nodes.length = 0; // 기존 배열 비우기
                            nodes.push(...loadedNodes); // 새 데이터 추가
                        }
                        console.log('로드된 노드 수:', loadedNodes.length);
                        
                        // 각 노드에 필요한 물리 속성 추가
                        loadedNodes.forEach(node => {
                            if (!node.phase) node.phase = Math.random() * Math.PI * 2;
                            if (!node.vx) node.vx = 0;
                            if (!node.vy) node.vy = 0;
                            if (!node.mass) node.mass = 1;
                        });
                        
                        // 즉시 렌더링 호출
                        console.log('노드 로드 완료, 렌더링 시작');
                        setTimeout(() => {
                            if (typeof render === 'function') {
                                render();
                                console.log('첫 번째 렌더링 완료');
                            }
                            if (typeof renderCalendar === 'function') {
                                renderCalendar();
                            }
                            if (typeof renderFolderTree === 'function') {
                                renderFolderTree();
                            }
                        }, 100);
                        
                    } else {
                        // 첫 로그인시 빈 상태로 시작 (기본 노드 생성하지 않음)
                        console.log('첫 로그인 - 노드가 없습니다. 빈 상태로 시작합니다.');
                        window.nodes = []; // 빈 배열로 초기화
                        // node-manager.js의 전역 nodes 배열도 동기화
                        if (typeof nodes !== 'undefined') {
                            nodes.length = 0;
                        }
                    }

                    // UI 업데이트 함수들 호출 (존재하는 경우에만)
                    if (typeof updateLinks === 'function') updateLinks();
                    if (typeof render === 'function') render();
                    if (typeof renderCalendar === 'function') renderCalendar();
                    if (typeof renderFolderTree === 'function') renderFolderTree();
                    if (typeof updateFolderButtons === 'function') updateFolderButtons();

                    // 애니메이션 시작 (중복 방지)
                    if (window.state && !window.state.animationStarted && window.nodes?.length > 0) {
                        window.state.animationStarted = true;
                        console.log('Firebase에서 애니메이션 시작 - 노드 수:', window.nodes.length);
                        if (typeof updateFloating === 'function') updateFloating();
                    }

                } else {
                    // 로그아웃 상태 - UI 업데이트
                    this.showLoggedOutState();
                    
                    // 데이터 초기화 (두 배열 모두)
                    if (window.nodes) window.nodes.length = 0;
                    if (typeof nodes !== 'undefined') nodes.length = 0;
                    if (window.links) window.links.length = 0;
                    if (typeof links !== 'undefined') links.length = 0;
                    
                    // 실시간 리스너 정리
                    if (this.realtimeListener) {
                        console.log('기존 실시간 리스너 정리');
                        this.realtimeListener();
                        this.realtimeListener = null;
                    }
                    
                    if (typeof render === 'function') render();
                }
            });
            
        } catch (error) {
            console.error('인증 초기화 실패:', error);
        }
    },

    // 새로운 로그인 UI 설정
    setupLoginUI: function() {
        // 탭 전환 이벤트
        const loginTabs = document.querySelectorAll('.login-tab');
        const authForms = document.querySelectorAll('.auth-form');

        loginTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // 탭 활성화
                loginTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // 폼 전환
                authForms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === targetTab + 'Form') {
                        form.classList.add('active');
                    }
                });
            });
        });

        // 로그인 폼 이벤트
        const signinForm = document.getElementById('signinForm');
        if (signinForm) {
            signinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
                await this.signInWithEmail(email, password);
            });
        }

        // 회원가입 폼 이벤트
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (password !== confirmPassword) {
                    this.showError('비밀번호가 일치하지 않습니다.');
                    return;
                }
                
                await this.signUpWithEmail(email, password);
            });
        }

        // 로그아웃 버튼 이벤트
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.signOut();
            });
        }
    },

    // 로그인 상태 UI 표시
    showLoggedInState: function(user) {
        const loginModal = document.getElementById('loginModal');
        const userStatusBar = document.getElementById('userStatusBar');
        const userDisplayName = document.getElementById('userDisplayName');
        const rightButtonGroup = document.querySelector('.right-button-group');
        
        // 로그인 모달 숨기기
        if (loginModal) {
            loginModal.classList.add('hidden');
        }
        
        // 사용자 상태바 표시
        if (userStatusBar) {
            userStatusBar.style.display = 'flex';
        }
        
        // 사용자 이름 표시
        if (userDisplayName) {
            if (user.isAnonymous) {
                userDisplayName.textContent = '게스트 사용자';
            } else {
                userDisplayName.textContent = user.email;
            }
        }
        
        // 우측 버튼 그룹 활성화
        if (rightButtonGroup) {
            rightButtonGroup.classList.remove('disabled');
        }
        
        console.log('로그인 완료:', user.email || '익명 사용자');
    },

    // 로그아웃 상태 UI 표시
    showLoggedOutState: function() {
        const loginModal = document.getElementById('loginModal');
        const userStatusBar = document.getElementById('userStatusBar');
        const rightButtonGroup = document.querySelector('.right-button-group');
        
        // 로그인 모달 표시
        if (loginModal) {
            loginModal.classList.remove('hidden');
        }
        
        // 사용자 상태바 숨기기
        if (userStatusBar) {
            userStatusBar.style.display = 'none';
        }
        
        // 우측 버튼 그룹 비활성화
        if (rightButtonGroup) {
            rightButtonGroup.classList.add('disabled');
        }
        
        console.log('로그아웃 상태');
    },

    // 이메일 로그인 (새로운 방식)
    signInWithEmail: async function (email, password) {
        try {
            // 동적 임포트로 인증 함수 가져오기
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
            
            await signInWithEmailAndPassword(auth, email, password);
            console.log('로그인 성공');
            this.clearError();
        } catch (error) {
            console.error('로그인 실패:', error);
            this.showError(this.getErrorMessage(error));
        }
    },

    // 이메일 회원가입 (새로운 방식)
    signUpWithEmail: async function (email, password) {
        try {
            // 동적 임포트로 인증 함수 가져오기
            const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
            
            await createUserWithEmailAndPassword(auth, email, password);
            console.log('회원가입 성공');
            this.clearError();
        } catch (error) {
            console.error('회원가입 실패:', error);
            this.showError(this.getErrorMessage(error));
        }
    },

    // 로그아웃 (v11 문법)
    signOut: async function () {
        try {
            // 동적 임포트로 인증 함수 가져오기
            const { signOut } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
            
            await signOut(auth);
            console.log('로그아웃 성공');
        } catch (error) {
            console.error('로그아웃 실패:', error);
        }
    },

    // 익명 로그인 (추가 기능)
    signInAnonymously: async function () {
        try {
            // 동적 임포트로 인증 함수 가져오기
            const { signInAnonymously } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js');
            
            await signInAnonymously(auth);
            console.log('익명 로그인 성공');
        } catch (error) {
            console.error('익명 로그인 실패:', error);
        }
    },

    // 현재 사용자 정보 가져오기
    getCurrentUser: function () {
        return auth?.currentUser || null;
    },

    // Firebase 서비스 인스턴스 가져오기
    getAuth: function () {
        return auth;
    },

    getFirestore: function () {
        return db;
    },

    getApp: function () {
        return app;
    },

    // 디버깅 함수 - Firebase 연결 상태 확인
    debugFirebaseStatus: function() {
        console.log('=== Firebase 상태 디버깅 ===');
        console.log('App 초기화 상태:', !!app);
        console.log('Auth 초기화 상태:', !!auth);
        console.log('Firestore 초기화 상태:', !!db);
        console.log('현재 사용자:', auth?.currentUser ? {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            isAnonymous: auth.currentUser.isAnonymous
        } : 'null');
        console.log('사용자 로그인 상태:', !!auth?.currentUser);
        console.log('로컬 nodes 배열 길이:', nodes?.length || 0);
        console.log('window.nodes 배열 길이:', window.nodes?.length || 0);
        console.log('========================');
    },

    // 노드 상태 디버깅 함수 추가
    debugNodeStatus: function() {
        console.log('=== 노드 상태 디버깅 ===');
        console.log('window.nodes:', window.nodes?.length || 0, '개');
        if (window.nodes?.length > 0) {
            console.table(window.nodes.map(n => ({
                id: n.id,
                title: n.title,
                folder: n.folder,
                x: Math.round(n.x),
                y: Math.round(n.y)
            })));
        }
        
        console.log('로컬 nodes:', typeof nodes !== 'undefined' ? nodes.length : 'undefined', '개');
        if (typeof nodes !== 'undefined' && nodes.length > 0) {
            console.table(nodes.map(n => ({
                id: n.id,
                title: n.title,
                folder: n.folder,
                x: Math.round(n.x),
                y: Math.round(n.y)
            })));
        }
        
        console.log('DOM 노드:', document.querySelectorAll('.node').length, '개');
        const domNodes = [];
        document.querySelectorAll('.node').forEach(el => {
            domNodes.push({
                'data-id': el.getAttribute('data-id'),
                title: el.querySelector('.node-title')?.textContent || 'N/A'
            });
        });
        if (domNodes.length > 0) {
            console.table(domNodes);
        }
        
        console.log('========================');
    },

    // 노드 동기화 강제 실행
    forceNodeSync: async function() {
        console.log('노드 동기화 강제 실행...');
        
        // DOM에서 모든 노드 제거
        document.querySelectorAll('.node').forEach(el => el.remove());
        
        // 노드 재로드
        await this.forceReloadNodes();
        
        console.log('노드 동기화 완료');
    },

    // 노드 데이터 검증 함수
    validateNodeData: function(node) {
        const issues = [];
        
        if (!node.id && node.id !== 0) {
            issues.push('ID가 없습니다');
        } else if (typeof node.id === 'number' && isNaN(node.id)) {
            issues.push('ID가 NaN입니다');
        }
        
        if (!node.userId) {
            issues.push('userId가 없습니다');
        }
        
        if (typeof node.x !== 'number' || isNaN(node.x)) {
            issues.push('x 좌표가 유효하지 않습니다');
        }
        
        if (typeof node.y !== 'number' || isNaN(node.y)) {
            issues.push('y 좌표가 유효하지 않습니다');
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    },

    // 긴급 복구 함수 - 노드 강제 재로드
    forceReloadNodes: async function() {
        console.log('노드 강제 재로드 시작...');
        
        if (!auth?.currentUser) {
            console.error('사용자가 로그인되지 않았습니다.');
            return;
        }

        try {
            // 동적 임포트
            const { 
                collection, 
                query, 
                where, 
                getDocs 
            } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            const nodesQuery = query(
                collection(db, 'nodes'),
                where('userId', '==', user.uid)
            );

            const snapshot = await getDocs(nodesQuery);
            const reloadedNodes = [];
            
            snapshot.forEach(doc => {
                const nodeData = doc.data();
                const node = {
                    ...nodeData,
                    id: parseInt(doc.id),
                    vx: nodeData.vx || 0,
                    vy: nodeData.vy || 0,
                    phase: nodeData.phase || Math.random() * Math.PI * 2
                };
                reloadedNodes.push(node);
            });

            // 전역 배열 강제 업데이트
            window.nodes = reloadedNodes;
            nodes = reloadedNodes;
            
            console.log('노드 강제 재로드 완료:', reloadedNodes.length, '개');
            
            // UI 강제 업데이트
            if (typeof updateLinks === 'function') updateLinks();
            if (typeof render === 'function') render();
            if (typeof renderFolderTree === 'function') renderFolderTree();
            
            return reloadedNodes;
            
        } catch (error) {
            console.error('노드 강제 재로드 실패:', error);
            return [];
        }
    },

    // 오류 메시지 표시
    showError: function(message) {
        const errorElement = document.getElementById('authErrorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // 3초 후 자동 숨김
            setTimeout(() => {
                this.clearError();
            }, 3000);
        }
    },

    // 오류 메시지 제거
    clearError: function() {
        const errorElement = document.getElementById('authErrorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    },

    // Firebase 오류 메시지 번역
    getErrorMessage: function(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return '등록되지 않은 이메일입니다.';
            case 'auth/wrong-password':
                return '비밀번호가 올바르지 않습니다.';
            case 'auth/email-already-in-use':
                return '이미 사용 중인 이메일입니다.';
            case 'auth/weak-password':
                return '비밀번호는 6자 이상이어야 합니다.';
            case 'auth/invalid-email':
                return '올바르지 않은 이메일 형식입니다.';
            case 'auth/operation-not-allowed':
                return '이메일/비밀번호 로그인이 비활성화되어 있습니다.';
            case 'auth/too-many-requests':
                return '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
            default:
                return '로그인 중 오류가 발생했습니다: ' + error.message;
        }
    },

    // 기존 signIn, signUp 메서드는 호환성을 위해 유지하지만 새로운 로그인 UI 사용을 권장
    signIn: async function () {
        // 기존 메서드는 더 이상 사용하지 않음
        console.warn('구버전 signIn 메서드입니다. 새로운 로그인 UI를 사용하세요.');
        // 빈 입력 필드가 있다면 무시
        return;
    },

    signUp: async function () {
        // 기존 메서드는 더 이상 사용하지 않음
        console.warn('구버전 signUp 메서드입니다. 새로운 로그인 UI를 사용하세요.');
        // 빈 입력 필드가 있다면 무시
        return;
    },

    // 빈 노드 정리 함수 추가
    cleanupEmptyNodes: async function() {
        if (!auth?.currentUser) {
            console.warn('사용자가 로그인되지 않아 빈 노드를 정리할 수 없습니다.');
            return;
        }

        try {
            console.log('빈 노드 정리 시작...');
            const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            const q = query(
                collection(db, 'nodes'),
                where('userId', '==', user.uid)
            );

            const querySnapshot = await getDocs(q);
            const emptyNodes = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const nodeId = doc.id;
                
                // 빈 노드 조건: 제목이 없거나, ID가 유효하지 않거나, NaN인 경우
                if (!data.title || data.title.trim() === '' || 
                    !nodeId || nodeId === 'NaN' || nodeId === 'null' || nodeId === 'undefined') {
                    emptyNodes.push(nodeId);
                    console.log('빈 노드 발견:', nodeId, data);
                }
            });

            console.log('삭제할 빈 노드 수:', emptyNodes.length);

            // 빈 노드들 삭제
            for (const nodeId of emptyNodes) {
                try {
                    await this.deleteNode(nodeId);
                    console.log('빈 노드 삭제 완료:', nodeId);
                } catch (error) {
                    console.error('빈 노드 삭제 실패:', nodeId, error);
                }
            }

            console.log('빈 노드 정리 완료');
        } catch (error) {
            console.error('빈 노드 정리 중 오류:', error);
        }
    },

    // 잘못된 ID를 가진 노드들 정리 함수
    cleanupInvalidIdNodes: async function() {
        if (!auth?.currentUser) {
            console.warn('사용자가 로그인되지 않아 잘못된 ID 노드를 정리할 수 없습니다.');
            return;
        }

        try {
            console.log('잘못된 ID 노드 정리 시작...');
            const { collection, query, where, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            const q = query(
                collection(db, 'nodes'),
                where('userId', '==', user.uid)
            );

            const querySnapshot = await getDocs(q);
            const invalidNodes = [];

            querySnapshot.forEach((document) => {
                const data = document.data();
                const docId = document.id;
                
                // 잘못된 ID 조건 체크
                const isInvalidId = docId === 'NaN' || 
                                   docId === 'null' || 
                                   docId === 'undefined' || 
                                   isNaN(parseFloat(docId)) ||
                                   !data.title || 
                                   data.title.trim() === '';
                
                if (isInvalidId) {
                    invalidNodes.push({
                        docId: docId,
                        data: data
                    });
                    console.log('잘못된 ID 노드 발견:', {
                        docId: docId,
                        title: data.title,
                        isFolder: data.isFolder
                    });
                }
            });

            console.log('삭제할 잘못된 ID 노드 수:', invalidNodes.length);

            // 잘못된 노드들 삭제
            for (const invalidNode of invalidNodes) {
                try {
                    const nodeRef = doc(db, 'nodes', invalidNode.docId);
                    await deleteDoc(nodeRef);
                    console.log('잘못된 ID 노드 삭제 완료:', invalidNode.docId);
                } catch (error) {
                    console.error('잘못된 ID 노드 삭제 실패:', invalidNode.docId, error);
                }
            }

            console.log('잘못된 ID 노드 정리 완료');
            return invalidNodes.length;
        } catch (error) {
            console.error('잘못된 ID 노드 정리 중 오류:', error);
            return 0;
        }
    },

    // 사용자 데이터 저장 (범용 함수)
    saveUserData: async function (field, data) {
        if (!auth?.currentUser) {
            throw new Error('로그인이 필요합니다.');
        }

        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            const userDocRef = doc(db, 'users', user.uid);
            
            // 기존 문서에 필드만 업데이트
            await setDoc(userDocRef, {
                [field]: data,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`사용자 데이터 저장 완료: ${field}`);
        } catch (error) {
            console.error('사용자 데이터 저장 실패:', error);
            throw error;
        }
    },

    // 사용자 데이터 로드 (범용 함수)
    getUserData: async function (field) {
        if (!auth?.currentUser) {
            return null;
        }

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
            
            const user = auth.currentUser;
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const data = userDoc.data();
                return field ? data[field] : data;
            }
            
            return null;
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
            return null;
        }
    },
};

// 페이지 로드 시 Firebase 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeFirebase();
        await FirebaseManager.initAuth();
        console.log('Firebase Manager 초기화 완료');
    } catch (error) {
        console.error('Firebase Manager 초기화 실패:', error);
    }
});

// 전역으로 노출 (다른 스크립트에서 사용 가능)
window.FirebaseManager = FirebaseManager;
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseFirestore = db;

// 디버깅을 위한 헬퍼 함수들
window.debugFirebase = {
    // 현재 상태 확인
    status: () => FirebaseManager.debugFirebaseStatus(),
    
    // 노드 상태 확인
    nodes: () => FirebaseManager.debugNodeStatus(),
    
    // 잘못된 ID 노드 정리
    cleanupInvalidIds: () => FirebaseManager.cleanupInvalidIdNodes(),
    
    // 빈 노드 정리
    cleanupEmpty: () => FirebaseManager.cleanupEmptyNodes(),
    
    // 노드 강제 재로드
    forceReload: () => FirebaseManager.forceReloadNodes(),
    
    // 노드 동기화 강제 실행
    forceSync: () => FirebaseManager.forceNodeSync()
}; 