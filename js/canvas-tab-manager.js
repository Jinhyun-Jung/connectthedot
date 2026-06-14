/**
 * 캔버스 탭 관리 시스템
 * 여러 캔버스를 탭으로 관리하고 각 탭별로 독립적인 노드 데이터를 유지
 */

class CanvasTabManager {
    constructor() {
        this.canvases = new Map();
        this.currentCanvasId = 'canvas1';
        this.tabCounter = 1;
        this.initialize();
    }

    initialize() {
        console.log('CanvasTabManager 초기화 시작');
        
        // 첫 번째 캔버스 초기화
        this.canvases.set('canvas1', {
            id: 'canvas1',
            name: '우주1',
            nodes: [],
            transform: { x: 0, y: 0, scale: 1 },
            panOffset: { x: 0, y: 0 },
            createdAt: new Date().toISOString()
        });

        this.bindEvents();
        this.loadCanvasData();
        
        console.log('CanvasTabManager 초기화 완료');
    }

    bindEvents() {
        // 탭 클릭 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.closest('.tab-item')) {
                const tabItem = e.target.closest('.tab-item');
                const canvasId = tabItem.dataset.canvasId;
                if (canvasId) {
                    this.switchToCanvas(canvasId);
                }
            }
        });

        // 탭 이름 더블클릭 편집
        document.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('tab-name')) {
                this.startEditingTabName(e.target);
            }
        });

        // 탭 이름 편집 완료
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('tab-name') && e.target.classList.contains('editing')) {
                if (e.key === 'Enter') {
                    this.finishEditingTabName(e.target);
                } else if (e.key === 'Escape') {
                    this.cancelEditingTabName(e.target);
                }
            }
        });

        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('tab-name') && e.target.classList.contains('editing')) {
                this.finishEditingTabName(e.target);
            }
        }, true);
    }

    addNewCanvasTab() {
        this.tabCounter++;
        const newCanvasId = `canvas${this.tabCounter}`;
        const newCanvasName = `우주${this.tabCounter}`;

        // 새 캔버스 데이터 생성
        this.canvases.set(newCanvasId, {
            id: newCanvasId,
            name: newCanvasName,
            nodes: [],
            transform: { x: 0, y: 0, scale: 1 },
            panOffset: { x: 0, y: 0 },
            createdAt: new Date().toISOString()
        });

        // 탭 UI 추가
        this.addTabToUI(newCanvasId, newCanvasName);
        
        // 새 탭으로 전환
        this.switchToCanvas(newCanvasId);

        // Firebase에 저장
        this.saveCanvasData();

        console.log(`새 캔버스 탭 추가됨: ${newCanvasId} (${newCanvasName})`);
    }

    addTabToUI(canvasId, canvasName) {
        const tabList = document.querySelector('.tab-list');
        
        const tabItem = document.createElement('div');
        tabItem.className = 'tab-item';
        tabItem.dataset.canvasId = canvasId;
        
        tabItem.innerHTML = `
            <span class="tab-name">${canvasName}</span>
            <button class="tab-close" onclick="window.canvasTabManager.closeCanvasTab('${canvasId}')" title="탭 닫기">×</button>
        `;
        
        tabList.appendChild(tabItem);
    }

    closeCanvasTab(canvasId) {
        // 마지막 탭인 경우 삭제 불가
        if (this.canvases.size <= 1) {
            alert('마지막 캔버스는 삭제할 수 없습니다.');
            return;
        }

        // 현재 활성 탭을 삭제하는 경우 다른 탭으로 전환
        if (this.currentCanvasId === canvasId) {
            const canvasIds = Array.from(this.canvases.keys());
            const currentIndex = canvasIds.indexOf(canvasId);
            const nextCanvasId = currentIndex > 0 ? canvasIds[currentIndex - 1] : canvasIds[currentIndex + 1];
            
            if (nextCanvasId) {
                this.switchToCanvas(nextCanvasId);
            }
        }

        // 캔버스 데이터 삭제
        this.canvases.delete(canvasId);

        // UI에서 탭 제거
        const tabItem = document.querySelector(`[data-canvas-id="${canvasId}"]`);
        if (tabItem) {
            tabItem.remove();
        }

        // Firebase에서 삭제
        this.deleteCanvasFromFirebase(canvasId);

        console.log(`캔버스 탭 삭제됨: ${canvasId}`);
    }

    async switchToCanvas(canvasId) {
        if (!this.canvases.has(canvasId)) {
            console.error(`존재하지 않는 캔버스: ${canvasId}`);
            return;
        }

        // 현재 캔버스 상태 저장
        this.saveCurrentCanvasState();

        // 새 캔버스로 전환
        this.currentCanvasId = canvasId;
        const canvasData = this.canvases.get(canvasId);

        // 탭 UI 업데이트
        this.updateTabUI();

        // 캔버스 렌더링
        await this.loadCanvasState(canvasData);

        console.log(`캔버스 전환됨: ${canvasId} (${canvasData.name})`);
    }

    updateTabUI() {
        // 모든 탭에서 active 클래스 제거
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
        });

        // 현재 활성 탭에 active 클래스 추가
        const activeTab = document.querySelector(`[data-canvas-id="${this.currentCanvasId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    saveCurrentCanvasState() {
        if (!this.currentCanvasId || !this.canvases.has(this.currentCanvasId)) return;

        const canvasData = this.canvases.get(this.currentCanvasId);
        
        // 현재 노드 상태 저장
        if (window.nodes) {
            canvasData.nodes = [...window.nodes];
        }

        // 캔버스 변환 상태 저장
        if (window.transform) {
            canvasData.transform = { ...window.transform };
        }

        if (window.panOffset) {
            canvasData.panOffset = { ...window.panOffset };
        }

        canvasData.updatedAt = new Date().toISOString();
        
        console.log(`캔버스 상태 저장됨: ${this.currentCanvasId}`, canvasData);
    }

    async loadCanvasState(canvasData) {
        // Firebase에서 해당 캔버스의 노드 로드
        if (window.FirebaseManager) {
            try {
                const canvasNodes = await window.FirebaseManager.loadNodes(canvasData.id);
                console.log(`캔버스 ${canvasData.id} 노드 로드 완료:`, canvasNodes.length, '개');
                window.nodes = canvasNodes || [];
            } catch (error) {
                console.error('캔버스 노드 로드 실패:', error);
                window.nodes = [...canvasData.nodes]; // 백업으로 로컬 데이터 사용
            }
        } else {
            // Firebase 미연결 시 로컬 데이터 사용
            window.nodes = [...canvasData.nodes];
        }

        // 캔버스 변환 상태 복원
        if (canvasData.transform) {
            window.transform = { ...canvasData.transform };
        }

        if (canvasData.panOffset) {
            window.panOffset = { ...canvasData.panOffset };
        }

        // 캔버스 렌더링
        if (window.renderNodes) {
            window.renderNodes();
        }

        // 캔버스 변환 적용
        this.applyCanvasTransform();
    }

    applyCanvasTransform() {
        const canvas = document.getElementById('canvas');
        if (!canvas || !window.transform) return;

        const { x, y, scale } = window.transform;
        canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    startEditingTabName(tabNameElement) {
        const canvasId = tabNameElement.closest('.tab-item').dataset.canvasId;
        const currentName = tabNameElement.textContent;

        tabNameElement.classList.add('editing');
        tabNameElement.contentEditable = true;
        tabNameElement.focus();

        // 텍스트 선택
        const range = document.createRange();
        range.selectNodeContents(tabNameElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // 이전 이름 저장 (취소용)
        tabNameElement.dataset.originalName = currentName;
    }

    finishEditingTabName(tabNameElement) {
        const canvasId = tabNameElement.closest('.tab-item').dataset.canvasId;
        const newName = tabNameElement.textContent.trim();

        if (newName && newName !== tabNameElement.dataset.originalName) {
            // 캔버스 이름 업데이트
            if (this.canvases.has(canvasId)) {
                this.canvases.get(canvasId).name = newName;
                this.saveCanvasData();
                console.log(`캔버스 이름 변경됨: ${canvasId} -> ${newName}`);
            }
        }

        this.stopEditingTabName(tabNameElement);
    }

    cancelEditingTabName(tabNameElement) {
        // 원래 이름으로 복원
        tabNameElement.textContent = tabNameElement.dataset.originalName;
        this.stopEditingTabName(tabNameElement);
    }

    stopEditingTabName(tabNameElement) {
        tabNameElement.classList.remove('editing');
        tabNameElement.contentEditable = false;
        delete tabNameElement.dataset.originalName;
    }

    // Firebase 관련 메소드들
    async saveCanvasData() {
        if (!window.FirebaseManager || !window.FirebaseManager.getCurrentUser()) {
            console.log('Firebase 미연결 상태 - 캔버스 데이터 로컬 저장');
            this.saveToLocalStorage();
            return;
        }

        try {
            const canvasesData = {};
            this.canvases.forEach((canvas, id) => {
                canvasesData[id] = canvas;
            });

            await window.FirebaseManager.saveUserData('canvases', canvasesData);
            console.log('캔버스 데이터 Firebase 저장 완료');
        } catch (error) {
            console.error('캔버스 데이터 Firebase 저장 실패:', error);
            this.saveToLocalStorage();
        }
    }

    async loadCanvasData() {
        if (!window.FirebaseManager || !window.FirebaseManager.getCurrentUser()) {
            console.log('Firebase 미연결 상태 - 로컬 스토리지에서 로드');
            this.loadFromLocalStorage();
            return;
        }

        try {
            const canvasesData = await window.FirebaseManager.getUserData('canvases');
            
            if (canvasesData && Object.keys(canvasesData).length > 0) {
                this.canvases.clear();
                
                Object.entries(canvasesData).forEach(([id, canvas]) => {
                    this.canvases.set(id, canvas);
                });

                this.renderAllTabs();
                
                // 첫 번째 캔버스로 전환
                const firstCanvasId = Array.from(this.canvases.keys())[0];
                if (firstCanvasId) {
                    await this.switchToCanvas(firstCanvasId);
                }

                console.log('캔버스 데이터 Firebase 로드 완료');
            } else {
                console.log('Firebase에 캔버스 데이터 없음 - 기본 캔버스 사용 및 기존 노드 로드');
                // 기본 캔버스(canvas1)에서 기존 노드들을 로드
                await this.switchToCanvas('canvas1');
            }
        } catch (error) {
            console.error('캔버스 데이터 Firebase 로드 실패:', error);
            await this.loadFromLocalStorage();
        }
    }

    renderAllTabs() {
        const tabList = document.querySelector('.tab-list');
        tabList.innerHTML = '';

        this.canvases.forEach((canvas, id) => {
            this.addTabToUI(id, canvas.name);
        });
    }

    async deleteCanvasFromFirebase(canvasId) {
        // Firebase에서 특정 캔버스 삭제는 전체 캔버스 데이터 재저장으로 처리
        await this.saveCanvasData();
    }

    // 로컬 스토리지 백업
    saveToLocalStorage() {
        try {
            const canvasesData = {};
            this.canvases.forEach((canvas, id) => {
                canvasesData[id] = canvas;
            });
            
            localStorage.setItem('canvasTabData', JSON.stringify({
                canvases: canvasesData,
                currentCanvasId: this.currentCanvasId,
                tabCounter: this.tabCounter
            }));
        } catch (error) {
            console.error('로컬 스토리지 저장 실패:', error);
        }
    }

    async loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('canvasTabData');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                if (data.canvases && Object.keys(data.canvases).length > 0) {
                    this.canvases.clear();
                    Object.entries(data.canvases).forEach(([id, canvas]) => {
                        this.canvases.set(id, canvas);
                    });
                    
                    this.currentCanvasId = data.currentCanvasId || Array.from(this.canvases.keys())[0];
                    this.tabCounter = data.tabCounter || this.canvases.size;
                    
                    this.renderAllTabs();
                    await this.switchToCanvas(this.currentCanvasId);
                    
                    console.log('로컬 스토리지에서 캔버스 데이터 로드 완료');
                }
            }
        } catch (error) {
            console.error('로컬 스토리지 로드 실패:', error);
        }
    }

    // 현재 캔버스 정보 가져오기
    getCurrentCanvas() {
        return this.canvases.get(this.currentCanvasId);
    }

    getCurrentCanvasId() {
        return this.currentCanvasId;
    }

    // 모든 캔버스 목록 가져오기
    getAllCanvases() {
        return Array.from(this.canvases.values());
    }
}

// 전역 함수들 (HTML에서 호출용)
function addNewCanvasTab() {
    if (window.canvasTabManager) {
        window.canvasTabManager.addNewCanvasTab();
    }
}

function closeCanvasTab(canvasId) {
    if (window.canvasTabManager) {
        window.canvasTabManager.closeCanvasTab(canvasId);
    }
}

// 전역 변수로 설정
window.CanvasTabManager = CanvasTabManager;

console.log('CanvasTabManager 클래스 로드 완료'); 