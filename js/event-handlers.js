// 이벤트 핸들러 객체
const EventHandlers = {
    // 전역 이벤트 초기화
    init: function () {
        // 마우스 이벤트
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        // 휠 이벤트를 전체 문서에 등록 (캔버스에만 제한하지 않음)
        document.addEventListener('wheel', this.handleWheel, { passive: false });

        // 캔버스 이벤트
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('click', this.handleCanvasClick);
        canvas.addEventListener('contextmenu', this.handleCanvasContextMenu);

        // 전역 클릭으로 컨텍스트 메뉴 닫기
        document.addEventListener('click', this.closeCanvasContextMenu);

        // 윈도우 이벤트
        window.addEventListener('resize', render);

        // 감정 버튼 이벤트
        this.initEmotionButtons();

        // 추가 버튼 이벤트
        this.initAddButton();

        // 스프레드시트 버튼 이벤트 추가
        this.initSpreadsheetButton();

        // 드래그 가능한 패널 초기화
        this.initDraggablePanels();
    },

    // 스프레드시트 버튼 초기화 함수
    initSpreadsheetButton: function () {
        const spreadsheetBtn = document.getElementById('spreadsheetButton');
        if (spreadsheetBtn) {
            spreadsheetBtn.addEventListener('click', async () => {
                // 이미 에디터가 열려있다면 무시
                if (document.getElementById('editor').style.display === 'block') {
                    return;
                }
                console.log('스프레드시트 버튼 클릭됨');
                await createSpreadsheetNode();
            });
        }
    },

    // 마우스 이벤트 핸들러 (노드 드래그는 node-manager.js에서 처리)
    handleMouseMove: function (e) {
        // 캔버스 패닝 등 다른 용도로 사용
        // 노드 드래그는 node-manager.js에서 개별적으로 처리됨
    },

    handleMouseUp: function () {
        // 전역 상태 정리
        state.dragging = false;
    },

    // 휠 이벤트 핸들러
    handleWheel: function (e) {
        // UI 요소 위에서만 스크롤 무시 (좀 더 정확한 선택자 사용)
        const uiElements = [
            '#editor', 
            '.calendar-container', 
            '.folder-container', 
            '.auth-button', 
            '.right-button-group',
            '.show-folder-btn', 
            '.show-calendar-btn', 
            '#addButton', 
            '#spreadsheetButton', 
            '.login-container', 
            '.user-status-bar',
            '.mobile-calendar-table-container',
            '.context-menu',
            '.delete-confirmation',
            'input',
            'textarea',
            'select',
            'button'
        ];
        
        // 현재 타겟이 UI 요소인지 확인
        const isUIElement = uiElements.some(selector => {
            try {
                return e.target.closest && e.target.closest(selector);
            } catch (err) {
                return false;
            }
        });
        
        if (isUIElement) {
            console.log('UI 요소 위에서 휠 이벤트 무시:', e.target);
            return;
        }

        console.log('휠 이벤트 처리 시작:', {
            deltaY: e.deltaY,
            target: e.target.tagName || e.target.className
        });

        e.preventDefault();
        e.stopPropagation();
        
        const delta = e.deltaY;
        const scaleSpeed = 0.1;
        
        // 현재 상태에서 스케일 가져오기 (다양한 상태 객체 확인)
        let currentScale = 1;
        
        if (typeof state !== 'undefined' && state.transform && state.transform.scale) {
            currentScale = state.transform.scale;
        } else if (typeof canvasState !== 'undefined' && canvasState.scale) {
            currentScale = canvasState.scale;
        } else if (typeof window.canvasState !== 'undefined' && window.canvasState.scale) {
            currentScale = window.canvasState.scale;
        } else if (typeof state !== 'undefined' && state.scale) {
            currentScale = state.scale;
        }
        
        console.log('현재 스케일:', currentScale);
        
        const minScale = 0.1;
        const maxScale = 3;

        // 새로운 스케일 계산
        let newScale;
        if (delta > 0) {
            // 축소 (휠을 아래로)
            newScale = Math.max(currentScale / (1 + scaleSpeed), minScale);
        } else {
            // 확대 (휠을 위로)
            newScale = Math.min(currentScale * (1 + scaleSpeed), maxScale);
        }

        console.log('새로운 스케일:', newScale);

        // 스케일이 변경되었을 때만 업데이트
        if (Math.abs(newScale - currentScale) > 0.001) {
            // 모든 가능한 상태 객체에 스케일 업데이트
            if (typeof state !== 'undefined') {
                if (state.transform) {
                    state.transform.scale = newScale;
                }
                if (state.scale !== undefined) {
                    state.scale = newScale;
                }
            }
            
            if (typeof canvasState !== 'undefined') {
                canvasState.scale = newScale;
            }
            
            if (typeof window.canvasState !== 'undefined') {
                window.canvasState.scale = newScale;
            }

            // 캔버스 요소에 직접 스케일 적용
            const canvas = document.getElementById('canvas');
            if (canvas) {
                // 현재 transform 값 파싱
                const currentTransform = canvas.style.transform || 'translate(0px, 0px) scale(1)';
                const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                
                let translateX = '0px';
                let translateY = '0px';
                
                if (translateMatch) {
                    translateX = translateMatch[1].trim();
                    translateY = translateMatch[2].trim();
                }
                
                const newTransform = `translate(${translateX}, ${translateY}) scale(${newScale})`;
                canvas.style.transform = newTransform;
                
                console.log('캔버스 transform 업데이트:', newTransform);
            }

            // 노드들의 크기 업데이트 (있는 경우)
            if (typeof nodes !== 'undefined' && Array.isArray(nodes)) {
                nodes.forEach(node => {
                    if (!node.baseSize) {
                        node.baseSize = 100; // 기본 노드 크기
                    }
                    node.currentSize = node.baseSize * newScale;
                });
            }

            // 렌더링 실행
            if (typeof render === 'function') {
                render();
                console.log('렌더링 완료');
            } else {
                console.warn('render 함수를 찾을 수 없습니다');
            }
        }
    },

    // 캔버스 클릭 핸들러
    handleCanvasClick: function (e) {
        // 노드 클릭인 경우 무시 (노드 자체 이벤트에서 처리)
        if (e.target.closest('.node')) {
            return;
        }
        // 캔버스 자체를 클릭한 경우에만 에디터 닫기
        if (e.target === canvas || e.target.id === 'canvas') {
            closeEditor();
        }
    },

    // 감정 버튼 초기화
    initEmotionButtons: function () {
        document.querySelectorAll('.emotion-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emotion = e.currentTarget.dataset.emotion;
                if (state.selectedNode) {
                    state.selectedNode.emotion = emotion;
                    const nodeElement = document.querySelector(`.node[data-id="${state.selectedNode.id}"]`);
                    if (nodeElement) {
                        const titleElement = nodeElement.querySelector('.title');
                        if (titleElement) {
                            titleElement.style.color = emotionColorMap.get(emotion) || '#FFFFFF';
                        }
                    }
                }
                document.querySelectorAll('.emotion-button').forEach(b => {
                    b.style.opacity = b === e.currentTarget ? '1' : '0.5';
                    b.style.transform = b === e.currentTarget ? 'scale(1.1)' : 'scale(1)';
                });
            });
        });
    },

    // 추가 버튼 초기화
    initAddButton: function () {
        const addBtn = document.getElementById('addButton');
        if (!addBtn) {
            console.error('addButton을 찾을 수 없습니다');
            return;
        }

        addBtn.addEventListener('click', async () => {
            console.log('addButton 클릭됨');

            const editor = document.getElementById('editor');
            // 이미 에디터가 열려있다면 무시
            if (editor) {
                const computedDisplay = getComputedStyle(editor).display;
                if (computedDisplay !== 'none') {
                    console.log('에디터가 이미 열려있습니다:', computedDisplay);
                    return;
                }
            }

            let newNodeX, newNodeY;

            if (state.calendar.selectedDate) {
                const selectedDateStr = state.calendar.selectedDate.toISOString().split('T')[0];
                const selectedNodes = nodes.filter(node => node.date === selectedDateStr);

                if (selectedNodes.length > 0) {
                    const centerY = window.innerHeight / 2;
                    const startX = window.innerWidth * 0.2;
                    const spacing = 250;
                    newNodeX = startX + (selectedNodes.length * spacing);
                    newNodeY = centerY;
                } else {
                    newNodeX = window.innerWidth * 0.2;
                    newNodeY = window.innerHeight / 2;
                }
            } else {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const offsetX = Math.random() * 200 - 100;
                const offsetY = Math.random() * 200 - 100;
                newNodeX = centerX + offsetX;
                newNodeY = centerY + offsetY;
            }

            // 임시 노드 정보만 생성 (실제 노드는 저장 시 생성)
            const tempNodeData = {
                x: newNodeX,
                y: newNodeY,
                baseX: newNodeX,
                baseY: newNodeY,
                title: '',
                content: '',
                folder: state.selectedFolder || '/',
                emotion: 'default',
                date: state.calendar.selectedDate ? 
                      state.calendar.selectedDate.toISOString().split('T')[0] : 
                      new Date().toISOString().split('T')[0],
                isNew: true // 새 노드임을 표시
            };

            // 에디터만 열기 (노드 생성은 하지 않음)
            openEditorForNewNode(tempNodeData);
            
            if (state.calendar.selectedDate) {
                renderCalendar();
            }
        });
    },

    // 드래그 가능한 패널 초기화
    initDraggablePanels: function() {
        // 폴더 컨테이너 드래그 초기화
        const folderContainer = document.querySelector('.folder-container');
        const folderHeader = document.querySelector('.folder-header');
        if (folderContainer && folderHeader) {
            this.makeDraggable(folderContainer, folderHeader);
        }

        // 캘린더 컨테이너 드래그 초기화
        const calendarContainer = document.querySelector('.calendar-container');
        const calendarHeader = document.querySelector('.calendar-header');
        if (calendarContainer && calendarHeader) {
            this.makeDraggable(calendarContainer, calendarHeader);
        }
    },

    // 요소를 드래그 가능하게 만드는 함수
    makeDraggable: function(element, handle) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        // 핸들 요소에 마우스 다운 이벤트 추가
        handle.addEventListener('mousedown', (e) => {
            // 닫기 버튼 클릭은 무시
            if (e.target.classList.contains('folder-close-btn') || 
                e.target.classList.contains('calendar-close-btn')) {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // 현재 위치 가져오기
            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            // 드래그 중 스타일 적용
            element.style.zIndex = '1000';
            element.style.userSelect = 'none';
            
            e.preventDefault();
        });

        // 마우스 이동 이벤트
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // 화면 경계 확인
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;
            
            element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
        });

        // 마우스 업 이벤트
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = '';
                element.style.userSelect = '';
            }
        });

        // 터치 이벤트도 지원
        handle.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('folder-close-btn') || 
                e.target.classList.contains('calendar-close-btn')) {
                return;
            }

            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = element.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            element.style.zIndex = '1000';
            element.style.userSelect = 'none';
            
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            const maxLeft = window.innerWidth - element.offsetWidth;
            const maxTop = window.innerHeight - element.offsetHeight;
            
            element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            element.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            
            e.preventDefault();
        });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = '';
                element.style.userSelect = '';
            }
        });
    },

    // 캔버스 우클릭 컨텍스트 메뉴 핸들러
    handleCanvasContextMenu: function(e) {
        // 노드 위에서 우클릭한 경우는 무시 (노드 자체의 컨텍스트 메뉴 사용)
        if (e.target.closest('.node')) {
            return;
        }

        e.preventDefault();

        // 기존 컨텍스트 메뉴 제거
        EventHandlers.closeCanvasContextMenu();

        // 새 컨텍스트 메뉴 생성
        const menu = document.createElement('div');
        menu.className = 'canvas-context-menu';
        menu.innerHTML = `
            <div class="context-menu-item delete-all-nodes">
                <span class="context-menu-icon">🗑️</span>
                <span>모든 노드 삭제</span>
            </div>
        `;

        // 메뉴 위치 설정
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: #ffffff;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            min-width: 160px;
            padding: 8px 0;
            font-family: 'Noto Sans KR', sans-serif;
        `;

        document.body.appendChild(menu);

        // 삭제 버튼 클릭 이벤트
        menu.querySelector('.delete-all-nodes').addEventListener('click', () => {
            EventHandlers.closeCanvasContextMenu();
            EventHandlers.showDeleteAllConfirmation();
        });

        // 메뉴 아이템 호버 스타일 적용
        const menuItems = menu.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            item.style.cssText = `
                padding: 10px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #333;
                font-size: 14px;
                transition: background 0.15s ease;
            `;
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f5f5f5';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
        });

        // 삭제 항목은 빨간색으로
        const deleteItem = menu.querySelector('.delete-all-nodes');
        if (deleteItem) {
            deleteItem.style.color = '#ef4444';
        }
    },

    // 컨텍스트 메뉴 닫기
    closeCanvasContextMenu: function(e) {
        // 메뉴 클릭 시에는 닫지 않음
        if (e && e.target.closest('.canvas-context-menu')) {
            return;
        }
        const existingMenu = document.querySelector('.canvas-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    },

    // 모든 노드 삭제 확인 다이얼로그
    showDeleteAllConfirmation: function() {
        const nodesToUse = window.nodes || [];
        const nodeCount = nodesToUse.filter(n => !n.isFolder).length;

        if (nodeCount === 0) {
            alert('삭제할 노드가 없습니다.');
            return;
        }

        // 확인 다이얼로그 생성
        const overlay = document.createElement('div');
        overlay.className = 'delete-all-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'delete-all-dialog';
        dialog.innerHTML = `
            <div class="dialog-icon">⚠️</div>
            <div class="dialog-title">모든 노드 삭제</div>
            <div class="dialog-message">정말로 모든 노드(${nodeCount}개)를 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.</div>
            <div class="dialog-buttons">
                <button class="dialog-btn cancel-btn">취소</button>
                <button class="dialog-btn delete-btn">삭제</button>
            </div>
        `;
        dialog.style.cssText = `
            background: #ffffff;
            border-radius: 12px;
            padding: 24px;
            max-width: 360px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            font-family: 'Noto Sans KR', sans-serif;
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 스타일 적용
        const dialogIcon = dialog.querySelector('.dialog-icon');
        dialogIcon.style.cssText = 'font-size: 48px; margin-bottom: 12px;';

        const dialogTitle = dialog.querySelector('.dialog-title');
        dialogTitle.style.cssText = 'font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px;';

        const dialogMessage = dialog.querySelector('.dialog-message');
        dialogMessage.style.cssText = 'font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.5;';

        const dialogButtons = dialog.querySelector('.dialog-buttons');
        dialogButtons.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

        const cancelBtn = dialog.querySelector('.cancel-btn');
        cancelBtn.style.cssText = `
            padding: 10px 24px;
            border: 1px solid #ddd;
            background: #fff;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            color: #333;
            font-weight: 500;
            transition: all 0.2s ease;
        `;

        const deleteBtn = dialog.querySelector('.delete-btn');
        deleteBtn.style.cssText = `
            padding: 10px 24px;
            border: none;
            background: #ef4444;
            color: #fff;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
        `;

        // 버튼 이벤트
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#f5f5f5';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = '#fff';
        });

        deleteBtn.addEventListener('click', async () => {
            await EventHandlers.deleteAllNodes();
            overlay.remove();
        });

        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = '#dc2626';
        });
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = '#ef4444';
        });

        // 오버레이 클릭으로 닫기
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    },

    // 모든 노드 삭제 실행
    deleteAllNodes: async function() {
        const nodesToUse = window.nodes || [];
        const nodesToDelete = nodesToUse.filter(n => !n.isFolder);

        try {
            // Firebase에서 삭제
            if (window.FirebaseManager) {
                for (const node of nodesToDelete) {
                    await window.FirebaseManager.deleteNode(node.id);
                }
            }

            // 로컬 배열에서 삭제 (폴더는 유지)
            if (window.nodes) {
                window.nodes = window.nodes.filter(n => n.isFolder);
            }

            // 링크도 모두 삭제
            if (window.links) {
                window.links = [];
            }

            // 렌더링
            if (typeof render === 'function') {
                render();
            }

            // 알림
            if (typeof NodeManager !== 'undefined' && NodeManager.showErrorNotification) {
                NodeManager.showErrorNotification(`${nodesToDelete.length}개의 노드가 삭제되었습니다.`, 'success');
            }
        } catch (error) {
            console.error('노드 삭제 중 오류:', error);
            alert('노드 삭제 중 오류가 발생했습니다.');
        }
    }
}; 