// 전역 상태 관리
const state = {
    selectedNode: null,
    dragging: false,
    time: 0,
    scale: 1,
    minScale: 0.5,
    maxScale: 5,
    offset: { x: 0, y: 0 },
    transform: {
        x: 0,
        y: 0,
        scale: 1
    },
    isDragging: false,
    animationStarted: false,
    selectedFolder: '/',
    history: {
        undoStack: [],
        redoStack: [],
        maxSize: 50
    },
    floatingEnabled: true,
    calendar: {
        currentDate: new Date(),
        selectedDate: null,
        animating: false
    }
};

// 초기 노드 데이터 (WeakMap을 사용하여 메모리 누수 방지)
let nodes = [];
const nodeMetadata = new WeakMap(); // 노드 메타데이터 저장용

// 링크 데이터
let links = [];

// 성능 최적화를 위한 디바운스 및 스로틀 유틸리티
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// 폴더 색상 캐싱
const folderColorCache = new Map();

// 캔버스 상태
const canvasState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0,
    scale: 1,
    minScale: 0.3,
    maxScale: 3,
    transform: {
        x: 0,
        y: 0,
        scale: 1
    },
    isZooming: false,
    lastDistance: 0
};

// NodeManager 객체
const NodeManager = {
    debouncedUpdateUI: debounce(() => {
        if (typeof updateLinks === 'function') updateLinks();
        if (typeof render === 'function') render();
    }, 16),

    createNew: async function (x, y) {
        const now = new Date();
        const nodeId = Date.now();
        
        const newNode = {
            id: nodeId,
            title: '',
            content: '',
            x: Number(x) || 0,
            y: Number(y) || 0,
            baseX: Number(x) || 0,
            baseY: Number(y) || 0,
            phase: Math.random() * Math.PI * 2,
            folder: state.selectedFolder || '/',
            emotion: 'default',
            date: formatDateToISO(now),
            vx: 0,
            vy: 0,
            mass: 1,
            isTemporary: true,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        try {
            console.log('새 노드 생성:', { nodeId, position: { x: newNode.x, y: newNode.y } });
            
            if (window.FirebaseManager) {
                await window.FirebaseManager.saveNode(newNode);
            }

            const existingIds = new Set(nodes.map(node => node.id.toString()));
            if (!existingIds.has(newNode.id.toString())) {
                nodes.push(newNode);
            }

            this.debouncedUpdateUI();
            return newNode;
        } catch (error) {
            console.error('노드 생성 중 오류:', error);
            this.showErrorNotification('노드 생성에 실패했습니다. 다시 시도해주세요.', 'error');
            return null;
        }
    },

    add: async function (node) {
        if (!this.validateNode(node)) {
            throw new Error('유효하지 않은 노드 데이터입니다.');
        }

        try {
            if (window.FirebaseManager) {
                await window.FirebaseManager.saveNode(node);
            }
            
            nodes.push(node);
            this.debouncedUpdateUI();
            return node;
        } catch (error) {
            console.error('노드 추가 중 오류:', error);
            this.showErrorNotification('노드 추가에 실패했습니다.', 'error');
            return null;
        }
    },

    validateNode(node) {
        const requiredFields = ['id', 'title', 'x', 'y'];
        return requiredFields.every(field => 
            node.hasOwnProperty(field) && node[field] !== undefined
        );
    },

    showErrorNotification(message, type = 'error') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        const isSuccess = type === 'success';
        const backgroundColor = isSuccess ? '#4CAF50' : '#ff4444';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        const duration = isSuccess ? 2000 : 4000;
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
};

// 날짜 포맷 함수들
function formatDate(date) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}.${dd}`;
}

function formatDateToISO(date) {
    return date.toISOString().split('T')[0];
}

// 우주/밤하늘 테마 색상 팔레트
const cosmicPalette = [
    '#D7798B', // 로즈 핑크
    '#3D1C51', // 딥 퍼플
    '#7E397C', // 마젠타 퍼플
    '#8848B4', // 바이올렛
    '#9C91CD', // 라벤더
    '#E6A4B4', // 소프트 핑크
    '#5B3E90', // 로열 퍼플
    '#A855F7', // 브라이트 퍼플
    '#6366F1', // 인디고
    '#8B5CF6', // 퍼플
    '#C084FC', // 라이트 퍼플
    '#F472B6', // 핑크
    '#818CF8', // 퍼플 블루
    '#A78BFA', // 소프트 바이올렛
];

// 폴더 색상을 반환하는 함수 (우주 테마)
function getFolderColor(folder) {
    if (folderColorCache.has(folder)) {
        return folderColorCache.get(folder);
    }

    // 루트 폴더는 특별한 골드 색상
    if (folder === '/') {
        const color = '#F59E0B';
        folderColorCache.set(folder, color);
        return color;
    }

    let hash = 0;
    for (let i = 0; i < folder.length; i++) {
        hash = folder.charCodeAt(i) + ((hash << 5) - hash);
    }

    // 우주 테마 팔레트에서 색상 선택
    const colorIndex = Math.abs(hash) % cosmicPalette.length;
    const color = cosmicPalette[colorIndex];

    folderColorCache.set(folder, color);
    return color;
}

// 제목 길이에 따른 폰트 크기 계산 함수
function calculateTitleFontSize(title, isFolder = false) {
    if (!title) return isFolder ? '14px' : '16px';
    
    const length = title.length;
    let fontSize;
    
    if (isFolder) {
        if (length <= 3) fontSize = 18;
        else if (length <= 6) fontSize = 16;
        else if (length <= 10) fontSize = 14;
        else if (length <= 15) fontSize = 12;
        else fontSize = 10;
    } else {
        if (length <= 5) fontSize = 22;
        else if (length <= 10) fontSize = 18;
        else if (length <= 15) fontSize = 16;
        else if (length <= 25) fontSize = 14;
        else if (length <= 35) fontSize = 12;
        else if (length <= 50) fontSize = 11;
        else if (length <= 70) fontSize = 10;
        else fontSize = 9;
    }
    
    return `${fontSize}px`;
}

// 노드 생성 및 렌더링 함수
function createNodeElement(node) {
    const div = document.createElement('div');
    div.className = 'node';
    if (node.isFolder) {
        div.classList.add('folder-node');
    }
    if (node.isSpreadsheet) {
        div.classList.add('spreadsheet-node');
    }
    
    if (node.id === null || node.id === undefined) {
        console.error('노드에 ID가 없습니다:', node);
        return null;
    }
    
    const safeNodeId = node.id.toString();
    div.setAttribute('data-id', safeNodeId);
    div.setAttribute('data-emotion', node.emotion || 'default');

    div.style.opacity = node.opacity !== undefined ? node.opacity : 1;

    // HTML 태그 제거 및 이스케이프 함수
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // 제목에서 HTML 태그 제거 및 이스케이프
    const cleanTitle = escapeHtml(node.title || '');
    const truncatedTitle = cleanTitle && cleanTitle.length > 100 
        ? cleanTitle.substring(0, 100) + '...' 
        : cleanTitle;

    let textColor = node.isSpreadsheet ? '#4CAF50' : (node.titleColor || '#FFFFFF');

    if (node.isFolder) {
        // 폴더 노드는 folderPath를 사용하여 색상 결정
        textColor = getFolderColor(node.folderPath || node.folder || '/');
    }
    
    const titleFontSize = calculateTitleFontSize(node.title || '', node.isFolder);

    // 날짜 정보 준비 (폴더가 아닌 경우에만)
    let dateHTML = '';
    if (!node.isFolder && node.date) {
        let displayDate = '';
        try {
            let dateObj = node.date instanceof Date ? node.date : new Date(node.date);
                if (!isNaN(dateObj.getTime())) {
                displayDate = dateObj.toLocaleDateString('ko-KR', {
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short'
                });
            }
        } catch (error) {
            console.error('날짜 파싱 오류:', error);
        }
        
        if (displayDate && displayDate !== '') {
            const nodeBorderColor = getFolderColor(node.folder);
            dateHTML = `
                <div class="node-date-internal" style="
                    background: ${nodeBorderColor};
                    color: black;
                    font-size: 12px;
                    padding: 2px 6px;
                    border-radius: 8px;
                    margin-top: 4px;
                    text-align: center;
                    font-weight: bold;
                    letter-spacing: -0.3px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                ">${escapeHtml(displayDate)}</div>
            `;
        }
    }

    div.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            padding: 4px;
            box-sizing: border-box;
        ">
            <div class="title" style="font-size: ${titleFontSize}; color: ${textColor}; text-align: center; line-height: 1.5; margin: 0; width: 100%; word-break: keep-all; overflow-wrap: break-word;">
                ${truncatedTitle}
            </div>
            ${dateHTML}
        </div>
    `;

    const titleElement = div.querySelector('.title');

    div.style.left = node.x + 'px';
    div.style.top = node.y + 'px';

    // 테두리 색상 결정 - node.borderColor가 있으면 우선 적용
    let borderColor;

    // AI 생성 노드 디버그
    if (node.aiGenerated) {
        console.log(`🔍 createNodeElement AI노드: title=${node.title?.substring(0,15)}, borderColor=${node.borderColor}, depth=${node.depth}`);
    }

    if (node.borderColor) {
        // 사용자 지정 테두리 색상 우선 (폴더, 일반 노드 모두)
        borderColor = node.borderColor;
    } else if (node.isFolder) {
        // 폴더 노드: 자신의 폴더 경로 색상
        borderColor = getFolderColor(node.folderPath || node.folder || '/');
    } else if (node.folder && node.folder !== '/') {
        // 특정 폴더에 속한 노드: 폴더 색상
        borderColor = getFolderColor(node.folder);
    } else {
        // 일반 노드: 기본 폴더 색상
        borderColor = getFolderColor('/');
    }

    // 트렌디한 테두리 굵기 (3px)
    const borderWidth = '3px';

    // 테두리 적용
    console.log(`🎨 createNodeElement 최종 테두리: ${node.title?.substring(0,10)} -> ${borderColor}`);
    div.style.border = `${borderWidth} solid ${borderColor}`;
    div.style.setProperty('--border-color', borderColor);
    div.style.setProperty('--node-border-color', borderColor);

    // 컨텍스트 메뉴 이벤트 추가
    div.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.style.display = 'block';
        
        // 폴더 노드인 경우 더 많은 메뉴 추가
        if (node.isFolder) {
            menu.innerHTML = `
                <button class="link-folder-btn">🔗 연결</button>
                <button class="add-subnode-btn">📝 하위 노드 추가</button>
                <div class="context-menu-divider"></div>
                <button class="change-text-color-btn">🎨 텍스트 색상</button>
                <button class="change-border-color-btn">🖌️ 테두리 색상</button>
                <div class="context-menu-divider"></div>
                <button class="rename-btn">✏️ 이름 변경</button>
                <button class="delete-btn">🗑️ 삭제</button>
            `;
        } else {
            menu.innerHTML = `
                <button class="link-folder-btn">🔗 연결</button>
                <button class="delete-btn">🗑️ 삭제</button>
            `;
        }

        // 연결 버튼 이벤트 (폴더/일반 노드 모두)
        const linkFolderBtn = menu.querySelector('.link-folder-btn');
        if (linkFolderBtn) {
            linkFolderBtn.addEventListener('click', () => {
                menu.remove();
                showFolderLinkDialog(node, e.clientX, e.clientY);
            });
        }

        // 폴더 노드 메뉴 이벤트
        if (node.isFolder) {
            // 하위 노드 추가
            const addSubnodeBtn = menu.querySelector('.add-subnode-btn');
            if (addSubnodeBtn) {
                addSubnodeBtn.addEventListener('click', async () => {
                    menu.remove();
                    await createSubNode(node);
                });
            }

            // 이름 변경
            const renameBtn = menu.querySelector('.rename-btn');
            if (renameBtn) {
                renameBtn.addEventListener('click', () => {
                    showFolderRenameDialog(node, e.clientX, e.clientY);
                    menu.remove();
                });
            }

            // 텍스트 색상 변경
            const changeTextColorBtn = menu.querySelector('.change-text-color-btn');
            if (changeTextColorBtn) {
                changeTextColorBtn.addEventListener('click', () => {
                    menu.remove();
                    showColorPicker(node, 'text', e.clientX, e.clientY);
                });
            }

            // 테두리 색상 변경
            const changeBorderColorBtn = menu.querySelector('.change-border-color-btn');
            if (changeBorderColorBtn) {
                changeBorderColorBtn.addEventListener('click', () => {
                    menu.remove();
                    showColorPicker(node, 'border', e.clientX, e.clientY);
                });
            }
        }

        menu.querySelector('.delete-btn').addEventListener('click', async () => {
            showDeleteConfirmation(e.clientX, e.clientY, async () => {
                try {
                    const nodeIdToDelete = node.id;
                    
                    if (!nodeIdToDelete || isNaN(nodeIdToDelete)) {
                        console.error('유효하지 않은 노드 ID:', nodeIdToDelete);
                        const element = document.querySelector(`[data-id="${node.id}"]`);
                        if (element) element.remove();
                        
                        const index = nodes.indexOf(node);
                        if (index > -1) nodes.splice(index, 1);
                        
                        NodeManager.showErrorNotification('문제가 있는 노드가 삭제되었습니다.', 'success');
                        if (typeof render === 'function') render();
                        return;
                    }
                    
                    await FirebaseManager.deleteNode(nodeIdToDelete);
                    NodeManager.showErrorNotification('노드가 성공적으로 삭제되었습니다.', 'success');
                    
                } catch (error) {
                    console.error('노드 삭제 중 오류:', error);
                    NodeManager.showErrorNotification('삭제 중 오류가 발생했습니다.', 'error');
                }
            });
            menu.remove();
        });

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    });

    initNodeDragEvents(div, node);
    return div;
}

// 폴더 이름 변경 다이얼로그 함수
function showFolderRenameDialog(folderNode, x, y) {
    const dialog = document.createElement('div');
    dialog.className = 'folder-rename-dialog';
    dialog.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #333;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        min-width: 250px;
    `;
    
    dialog.innerHTML = `
        <div style="margin-bottom: 12px;">폴더 이름 변경</div>
        <input type="text" class="folder-name-input" value="${folderNode.title || ''}" 
               style="width: 100%; padding: 8px; border: 1px solid #555; background: #222; color: white; border-radius: 4px; margin-bottom: 12px;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="confirm-btn" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">확인</button>
            <button class="cancel-btn" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">취소</button>
        </div>
    `;
    
    const nameInput = dialog.querySelector('.folder-name-input');
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    
    // 입력 필드에 포커스하고 텍스트 선택
    setTimeout(() => {
        nameInput.focus();
        nameInput.select();
    }, 100);
    
    // 엔터키로 확인
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });
    
    confirmBtn.addEventListener('click', async () => {
        const newName = nameInput.value.trim();
        if (newName && newName !== folderNode.title) {
            try {
                // 폴더 이름 업데이트
                folderNode.title = newName;
                folderNode.updatedAt = new Date().toISOString();
                
                // Firebase에 저장
                if (window.FirebaseManager) {
                    await window.FirebaseManager.saveNode(folderNode);
                }
                
                // UI 업데이트
                if (typeof render === 'function') render();
                if (typeof renderFolderTree === 'function') renderFolderTree();
                
                NodeManager.showErrorNotification('폴더 이름이 변경되었습니다.', 'success');
                
            } catch (error) {
                console.error('폴더 이름 변경 중 오류:', error);
                NodeManager.showErrorNotification('이름 변경에 실패했습니다.', 'error');
            }
        }
        dialog.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });
    
    document.body.appendChild(dialog);
    
    // 다이얼로그 외부 클릭 시 닫기
    const closeDialog = (e) => {
        if (!dialog.contains(e.target)) {
            dialog.remove();
            document.removeEventListener('click', closeDialog);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeDialog);
    }, 100);
}

// 색상 선택 다이얼로그 함수
function showColorPicker(node, colorType, x, y) {
    const dialog = document.createElement('div');
    dialog.className = 'color-picker-dialog';
    dialog.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #333;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        min-width: 220px;
    `;

    const title = colorType === 'text' ? '텍스트 색상 선택' : '테두리 색상 선택';
    const currentColor = colorType === 'text'
        ? (node.titleColor || node.emotion || '#ffffff')
        : (node.borderColor || getFolderColor(node.folderPath || '/'));

    // 미리 정의된 색상 팔레트
    const colors = [
        '#F59E0B', '#EF4444', '#EC4899', '#A855F7', '#8B5CF6',
        '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#22C55E',
        '#84CC16', '#FACC15', '#F97316', '#78716C', '#FFFFFF'
    ];

    let colorButtons = colors.map(color => `
        <button class="color-option" data-color="${color}"
                style="width: 28px; height: 28px; background: ${color}; border: 2px solid ${color === currentColor ? '#fff' : 'transparent'};
                       border-radius: 4px; cursor: pointer; margin: 2px;">
        </button>
    `).join('');

    dialog.innerHTML = `
        <div style="margin-bottom: 12px; font-weight: bold;">${title}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px;">
            ${colorButtons}
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <label>직접 선택:</label>
            <input type="color" class="custom-color-input" value="${currentColor}"
                   style="width: 40px; height: 30px; border: none; cursor: pointer;">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="cancel-btn" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">취소</button>
        </div>
    `;

    document.body.appendChild(dialog);

    const customColorInput = dialog.querySelector('.custom-color-input');
    const cancelBtn = dialog.querySelector('.cancel-btn');

    // 색상 버튼 클릭 이벤트
    dialog.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const selectedColor = btn.dataset.color;
            await applyColorToNode(node, colorType, selectedColor);
            dialog.remove();
        });
    });

    // 커스텀 색상 선택
    customColorInput.addEventListener('change', async () => {
        const selectedColor = customColorInput.value;
        await applyColorToNode(node, colorType, selectedColor);
        dialog.remove();
    });

    // 취소 버튼
    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });

    // 다이얼로그 외부 클릭 시 닫기
    const closeDialog = (e) => {
        if (!dialog.contains(e.target)) {
            dialog.remove();
            document.removeEventListener('click', closeDialog);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeDialog);
    }, 100);
}

// 노드에 색상 적용 함수
async function applyColorToNode(node, colorType, color) {
    try {
        const nodesToUse = window.nodes || nodes || [];

        if (colorType === 'text') {
            node.titleColor = color;
            node.emotion = color; // emotion도 함께 업데이트
        } else if (colorType === 'border') {
            node.borderColor = color;
            // 폴더 색상 캐시 업데이트
            if (node.isFolder && node.folderPath) {
                folderColorCache.set(node.folderPath, color);

                // 폴더인 경우 해당 폴더에 속한 모든 하위 노드들의 테두리 색상도 변경
                const childNodes = nodesToUse.filter(n => {
                    // 직접 하위 노드 (일반 노드)
                    if (!n.isFolder && n.folder === node.folderPath) {
                        return true;
                    }
                    // 하위 폴더 노드 (folderPath가 현재 폴더 경로로 시작하는 폴더)
                    if (n.isFolder && n.folderPath && n.folderPath.startsWith(node.folderPath + '/')) {
                        return true;
                    }
                    // 하위 폴더에 속한 일반 노드
                    if (!n.isFolder && n.folder && n.folder.startsWith(node.folderPath + '/')) {
                        return true;
                    }
                    return false;
                });

                // 모든 하위 노드들의 테두리 색상 변경
                for (const childNode of childNodes) {
                    childNode.borderColor = color;
                    childNode.updatedAt = new Date().toISOString();

                    // Firebase에 저장
                    if (window.FirebaseManager) {
                        await window.FirebaseManager.saveNode(childNode);
                    }
                }

                console.log(`하위 노드 ${childNodes.length}개의 테두리 색상 변경됨`);
            }
        }

        node.updatedAt = new Date().toISOString();

        // Firebase에 저장
        if (window.FirebaseManager) {
            await window.FirebaseManager.saveNode(node);
        }

        // UI 업데이트
        if (typeof render === 'function') render();
        if (typeof renderFolderTree === 'function') renderFolderTree();

        console.log(`노드 ${colorType} 색상 변경:`, node.id, color);
    } catch (error) {
        console.error('색상 변경 실패:', error);
        NodeManager.showErrorNotification('색상 변경에 실패했습니다.', 'error');
    }
}

// 폴더 연결 다이얼로그 함수
function showFolderLinkDialog(node, x, y) {
    const dialog = document.createElement('div');
    dialog.className = 'folder-link-dialog';
    dialog.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #333;
        color: white;
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        min-width: 200px;
        max-width: 280px;
        max-height: 350px;
        overflow-y: auto;
    `;

    // 기존 폴더 노드들 가져오기
    const nodesToSearch = window.nodes || nodes || [];
    const folderNodes = nodesToSearch.filter(n => n && n.isFolder);

    // 현재 노드의 폴더 경로
    const currentFolder = node.folder || '/';

    // 폴더 목록 HTML 생성
    let folderListHtml = '';

    // 루트 폴더 (우주)
    const rootColor = getFolderColor('/');
    const isRootSelected = currentFolder === '/';
    folderListHtml += `
        <div class="folder-link-item ${isRootSelected ? 'selected' : ''}" data-path="/">
            <span class="folder-dot" style="background: ${rootColor}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
            <span>우주 (루트)</span>
        </div>
    `;

    // 폴더 노드들
    folderNodes.forEach(folder => {
        if (folder.id === node.id) return; // 자기 자신은 제외

        const folderPath = folder.folderPath || `/${folder.title}`;
        const folderColor = folder.borderColor || getFolderColor(folderPath);
        const isSelected = currentFolder === folderPath;

        folderListHtml += `
            <div class="folder-link-item ${isSelected ? 'selected' : ''}" data-path="${folderPath}" data-folder-id="${folder.id}">
                <span class="folder-dot" style="background: ${folderColor}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
                <span>${folder.title || '이름 없음'}</span>
            </div>
        `;
    });

    // + 새 폴더 추가 옵션
    folderListHtml += `
        <div class="folder-link-item add-new-folder" style="border-top: 1px solid #555; margin-top: 8px; padding-top: 8px;">
            <span style="color: #4CAF50;">➕</span>
            <span style="color: #4CAF50;">새 폴더 생성</span>
        </div>
    `;

    dialog.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 8px;">
            📁 연결할 폴더 선택
        </div>
        <div class="folder-link-list" style="display: flex; flex-direction: column; gap: 4px;">
            ${folderListHtml}
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
            <button class="cancel-btn" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">취소</button>
        </div>
    `;

    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .folder-link-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .folder-link-item:hover {
            background: rgba(102, 126, 234, 0.3);
        }
        .folder-link-item.selected {
            background: rgba(102, 126, 234, 0.5);
            border-left: 3px solid #667eea;
        }
        .folder-link-item.add-new-folder:hover {
            background: rgba(76, 175, 80, 0.2);
        }
    `;
    dialog.appendChild(style);

    document.body.appendChild(dialog);

    // 폴더 선택 이벤트
    dialog.querySelectorAll('.folder-link-item:not(.add-new-folder)').forEach(item => {
        item.addEventListener('click', async () => {
            const selectedPath = item.dataset.path;
            await linkNodeToFolder(node, selectedPath);
            dialog.remove();
        });
    });

    // 새 폴더 생성 이벤트
    const addNewFolderBtn = dialog.querySelector('.add-new-folder');
    if (addNewFolderBtn) {
        addNewFolderBtn.addEventListener('click', () => {
            dialog.remove();
            showCreateSubFolderDialog(node, x, y);
        });
    }

    // 취소 버튼
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
    });

    // 다이얼로그 외부 클릭 시 닫기
    const closeDialog = (e) => {
        if (!dialog.contains(e.target)) {
            dialog.remove();
            document.removeEventListener('click', closeDialog);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeDialog);
    }, 100);
}

// 노드를 폴더에 연결하는 함수
async function linkNodeToFolder(node, folderPath) {
    try {
        const previousFolder = node.folder;
        const nodesToUse = window.nodes || nodes || [];

        // 상위 폴더 노드 찾기
        const parentFolderNode = nodesToUse.find(n => n.isFolder && n.folderPath === folderPath);

        // 노드의 folder 속성 업데이트
        node.folder = folderPath;
        node.updatedAt = new Date().toISOString();

        // 폴더 노드인 경우 folderPath도 업데이트
        if (node.isFolder) {
            // 기존 folderPath에서 폴더 이름 추출
            const folderName = node.title || (node.folderPath ? node.folderPath.split('/').pop() : 'folder');
            // 새로운 folderPath 설정 (상위폴더경로/폴더이름)
            if (folderPath === '/') {
                node.folderPath = '/' + folderName;
            } else {
                node.folderPath = folderPath + '/' + folderName;
            }
        }

        // 상위 폴더의 테두리 색상을 상속받음
        if (parentFolderNode && parentFolderNode.borderColor) {
            node.borderColor = parentFolderNode.borderColor;
        }

        // Firebase에 저장
        if (window.FirebaseManager) {
            await window.FirebaseManager.saveNode(node);
        }

        // UI 업데이트 - 링크를 먼저 업데이트하고 렌더링
        console.log('updateLinks 호출 전, node.folder:', node.folder, 'folderPath:', folderPath);
        if (typeof updateLinks === 'function') {
            updateLinks();
            console.log('updateLinks 호출 후, links:', links.length);
        }
        if (typeof render === 'function') {
            render();
        }
        if (typeof renderFolderTree === 'function') {
            renderFolderTree();
        }

        console.log('노드 폴더 연결:', node.id, previousFolder, '->', folderPath);
        NodeManager.showErrorNotification(`"${folderPath}" 폴더에 연결되었습니다.`, 'success');
    } catch (error) {
        console.error('폴더 연결 실패:', error);
        NodeManager.showErrorNotification('폴더 연결에 실패했습니다.', 'error');
    }
}

// 하위 폴더 생성 다이얼로그
function showCreateSubFolderDialog(parentNode, x, y) {
    const dialog = document.createElement('div');
    dialog.className = 'create-subfolder-dialog';
    dialog.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #333;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        min-width: 250px;
    `;

    // 부모 폴더 경로 결정
    let parentPath = '/';
    if (parentNode.isFolder) {
        parentPath = parentNode.folderPath || `/${parentNode.title}`;
    } else {
        parentPath = parentNode.folder || '/';
    }

    dialog.innerHTML = `
        <div style="margin-bottom: 12px; font-weight: bold;">📁 새 폴더 생성</div>
        <div style="margin-bottom: 8px; font-size: 12px; color: #aaa;">
            상위 폴더: ${parentPath}
        </div>
        <input type="text" class="new-folder-name" placeholder="새 폴더 이름"
               style="width: 100%; padding: 8px; border: 1px solid #555; background: #222; color: white; border-radius: 4px; margin-bottom: 12px; box-sizing: border-box;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="confirm-btn" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">생성</button>
            <button class="cancel-btn" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">취소</button>
        </div>
    `;

    document.body.appendChild(dialog);

    const nameInput = dialog.querySelector('.new-folder-name');
    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');

    // 입력 필드에 포커스
    setTimeout(() => nameInput.focus(), 100);

    // 엔터키로 확인
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        } else if (e.key === 'Escape') {
            cancelBtn.click();
        }
    });

    // 생성 버튼
    confirmBtn.addEventListener('click', async () => {
        const folderName = nameInput.value.trim();
        if (!folderName) {
            nameInput.style.borderColor = '#ff5555';
            return;
        }

        try {
            const newFolderPath = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`;

            // 새 폴더 노드 생성
            const now = new Date();
            const folderNode = {
                id: Date.now(),
                title: folderName,
                content: '',
                date: now.toISOString().split('T')[0],
                x: parentNode.x + 150,
                y: parentNode.y + 100,
                baseX: parentNode.x + 150,
                baseY: parentNode.y + 100,
                phase: Math.random() * Math.PI * 2,
                emotion: '#667eea',
                folder: parentPath,
                folderPath: newFolderPath,
                isFolder: true,
                vx: 0,
                vy: 0,
                mass: 1,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            // Firebase에 저장
            if (window.FirebaseManager) {
                await window.FirebaseManager.saveNode(folderNode);
            }

            // 원래 노드를 새 폴더에 연결
            if (!parentNode.isFolder) {
                parentNode.folder = newFolderPath;
                parentNode.updatedAt = now.toISOString();
                if (window.FirebaseManager) {
                    await window.FirebaseManager.saveNode(parentNode);
                }
            }

            // UI 업데이트
            if (typeof updateLinks === 'function') updateLinks();
            if (typeof render === 'function') render();
            if (typeof renderFolderTree === 'function') renderFolderTree();

            dialog.remove();
            NodeManager.showErrorNotification(`"${folderName}" 폴더가 생성되었습니다.`, 'success');
        } catch (error) {
            console.error('폴더 생성 실패:', error);
            NodeManager.showErrorNotification('폴더 생성에 실패했습니다.', 'error');
        }
    });

    // 취소 버튼
    cancelBtn.addEventListener('click', () => {
        dialog.remove();
    });

    // 다이얼로그 외부 클릭 시 닫기
    const closeDialog = (e) => {
        if (!dialog.contains(e.target)) {
            dialog.remove();
            document.removeEventListener('click', closeDialog);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeDialog);
    }, 100);
}

// 삭제 확인 다이얼로그 함수
function showDeleteConfirmation(x, y, onConfirm) {
    const dialog = document.createElement('div');
    dialog.className = 'delete-confirmation';
    dialog.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #333;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        min-width: 200px;
    `;
    
    dialog.innerHTML = `
        <div style="margin-bottom: 12px;">정말 삭제하시겠습니까?</div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="confirm-btn" style="background: #ff4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">삭제</button>
            <button class="cancel-btn" style="background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">취소</button>
        </div>
    `;
    
    dialog.querySelector('.confirm-btn').addEventListener('click', () => {
        onConfirm();
        dialog.remove();
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        dialog.remove();
    });
    
    document.body.appendChild(dialog);
    
    setTimeout(() => {
        if (dialog.parentNode) {
            dialog.remove();
        }
    }, 5000);
}

// 노드 드래그 이벤트 초기화 함수
function initNodeDragEvents(div, node) {
    let isDragging = false;
    let startX, startY;
    let dragThreshold = 5;
    let hasMoved = false;
    let touchStartTime = 0;
    let longPressTimer;

    const throttledRender = throttle(() => {
        if (typeof render === 'function') render();
    }, 16);

    function handleTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        touchStartTime = performance.now();
        isDragging = true;
        hasMoved = false;
        
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        state.offset.x = touch.clientX - node.x;
        state.offset.y = touch.clientY - node.y;

        node.isDragging = true;
        div.classList.add('dragging');

        longPressTimer = setTimeout(() => {
            if (!hasMoved && typeof openEditor === 'function') {
                openEditor(node);
                isDragging = false;
                node.isDragging = false;
                div.classList.remove('dragging');
            }
        }, 500);
    }

    function handleTouchMove(e) {
        if (isDragging) {
            e.preventDefault();
            
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > dragThreshold) {
                hasMoved = true;
                clearTimeout(longPressTimer);
                
                node.x = touch.clientX - state.offset.x;
                node.y = touch.clientY - state.offset.y;
                
                // CSS transition 비활성화로 부드러운 드래그
                div.style.transition = 'none';
                div.style.left = node.x + 'px';
                div.style.top = node.y + 'px';
                
                throttledRender();
            }
        }
    }

    async function handleTouchEnd(e) {
        clearTimeout(longPressTimer);
        
        if (isDragging) {
            isDragging = false;
            node.isDragging = false;
            div.classList.remove('dragging');
            
            // CSS transition 복원
            div.style.transition = '';

            if (hasMoved) {
                try {
                    node.baseX = node.x;
                    node.baseY = node.y;
                    node.updatedAt = new Date().toISOString();
                    
                    if (window.FirebaseManager) {
                        await window.FirebaseManager.saveNode(node);
                    }
                } catch (error) {
                    console.error('터치 드래그 위치 저장 중 오류:', error);
                    NodeManager.showErrorNotification('위치 저장에 실패했습니다.', 'error');
                }
                
                // 드래그 종료 후 링크 다시 그리기
                if (typeof render === 'function') {
                    render();
                }
            }

            const touchDuration = performance.now() - touchStartTime;
            if (!hasMoved && touchDuration < 500 && typeof openEditor === 'function') {
                openEditor(node);
            }
        }
    }

    // 클릭으로 에디터 열기 여부 추적
    let clickHandled = false;

    div.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            hasMoved = false;
            clickHandled = false;  // 클릭 처리 플래그 초기화
            startX = e.clientX;
            startY = e.clientY;
            state.offset.x = e.clientX - node.x;
            state.offset.y = e.clientY - node.y;

            node.isDragging = true;
            div.classList.add('dragging');

            // 중요: 이벤트를 문서에 등록하여 마우스가 노드 밖으로 나가도 추적
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp, { passive: false });

            console.log('노드 mousedown:', node.id);
        }
    });

    // 더블클릭으로도 에디터 열기
    div.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('노드 더블클릭 - 에디터 열기:', node.id);
        if (typeof openEditor === 'function') {
            openEditor(node);
        }
    });

    async function handleMouseUp(e) {
        if (isDragging) {
            const wasMoving = hasMoved;

            isDragging = false;
            node.isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            div.classList.remove('dragging');

            // CSS transition 복원
            div.style.transition = '';

            console.log('노드 mouseup:', node.id, 'moved:', wasMoving);

            if (wasMoving) {
                try {
                    node.baseX = node.x;
                    node.baseY = node.y;
                    node.updatedAt = new Date().toISOString();

                    if (window.FirebaseManager) {
                        await window.FirebaseManager.saveNode(node);
                        console.log('드래그 위치 저장 완료:', node.id);
                    }
                } catch (error) {
                    console.error('마우스 드래그 위치 저장 중 오류:', error);
                    NodeManager.showErrorNotification('위치 저장에 실패했습니다.', 'error');
                }

                // 드래그 종료 후 링크 다시 그리기
                if (typeof render === 'function') {
                    render();
                }
            } else if (!wasMoving && !clickHandled && typeof openEditor === 'function') {
                // 드래그하지 않고 클릭만 한 경우 에디터 열기
                clickHandled = true;
                console.log('노드 클릭 감지 - 에디터 열기:', node.id);
                openEditor(node);
            }
        }
    }

    function handleMouseMove(e) {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > dragThreshold) {
                hasMoved = true;
                node.x = e.clientX - state.offset.x;
                node.y = e.clientY - state.offset.y;
                
                // CSS transition 비활성화로 부드러운 드래그
                div.style.transition = 'none';
                div.style.left = node.x + 'px';
                div.style.top = node.y + 'px';
                
                // 드래그 중 로그 (과도한 로깅 방지를 위해 가끔만)
                if (Math.random() < 0.1) {
                    console.log('드래그 중:', node.id, 'to', node.x, node.y);
                }
                
                throttledRender();
            }
        }
    }

    div.addEventListener('touchstart', handleTouchStart, { passive: false });
    div.addEventListener('touchmove', handleTouchMove, { passive: false });
    div.addEventListener('touchend', handleTouchEnd);
}

// 링크 업데이트 함수
function updateLinks() {
    const nodesToUse = window.nodes || nodes || [];

    // AI로 생성된 링크(폴더 링크가 아닌 것들)를 보존
    const aiLinks = links.filter(link => !link.isFolder);

    // 폴더 링크만 다시 계산
    links = [...aiLinks]; // AI 링크를 먼저 복사

    nodesToUse.forEach(node => {
        // 폴더가 아닌 노드이고, 루트가 아닌 폴더에 속한 경우
        if (!node.isFolder && node.folder && node.folder !== '/') {
            const parent = nodesToUse.find(n => n.isFolder && n.folderPath === node.folder);
            if (parent) {
                // 이미 존재하는 링크인지 확인
                const linkExists = links.some(l =>
                    l.source === parent.id && l.target === node.id
                );

                if (!linkExists) {
                    links.push({
                        source: parent.id,
                        target: node.id,
                        isFolder: true,
                        isDragging: node.isDragging || parent.isDragging
                    });
                }
            }
        }

        // 하위 폴더와 상위 폴더 연결
        if (node.isFolder && node.folderPath && node.folderPath !== '/') {
            // 상위 폴더 경로 찾기
            const pathParts = node.folderPath.split('/').filter(p => p);
            if (pathParts.length > 1) {
                const parentPath = '/' + pathParts.slice(0, -1).join('/');
                const parentFolder = nodesToUse.find(n => n.isFolder && n.folderPath === parentPath);

                if (parentFolder) {
                    const linkExists = links.some(l =>
                        l.source === parentFolder.id && l.target === node.id
                    );

                    if (!linkExists) {
                        links.push({
                            source: parentFolder.id,
                            target: node.id,
                            isFolder: true,
                            isDragging: node.isDragging || parentFolder.isDragging
                        });
                    }
                }
            }
        }
    });
}

// 사각형 노드의 경계점까지 거리 계산 (방향 고려)
function getRectEdgeDistance(halfWidth, halfHeight, angle) {
    // 사각형의 중심에서 특정 각도로 나가는 선이 사각형 경계와 만나는 점까지의 거리
    const absAngle = Math.abs(angle);
    const cornerAngle = Math.atan2(halfHeight, halfWidth);

    if (absAngle <= cornerAngle || absAngle >= Math.PI - cornerAngle) {
        // 좌우 변과 교차
        return Math.abs(halfWidth / Math.cos(angle));
    } else {
        // 상하 변과 교차
        return Math.abs(halfHeight / Math.sin(angle));
    }
}

// 노드 크기 계산 함수 (라인이 노드 테두리 바깥쪽에 닿도록)
function getNodeRadius(node, angle = 0) {
    // 테두리 두께 (3px) - 라인이 테두리 중앙에 닿도록 절반만 더함
    const borderOffset = 1.5;

    // 노드와 SVG 라인 모두 캔버스 내부에 있어 동일한 스케일이 적용됨
    // 따라서 스케일 보정 불필요 - 고정 픽셀 값 사용

    if (node.isFolder) {
        // 폴더 노드: 사각형 (CSS: width = 70 * 1.4 = 98px, height = 70 * 0.9 = 63px)
        // translate(-50%, -50%)로 중심 기준
        // 테두리 중앙까지 = (크기/2) + 테두리절반
        const halfWidth = (70 * 1.4) / 2 + borderOffset;  // 49 + 1.5 = 50.5px
        const halfHeight = (70 * 0.9) / 2 + borderOffset; // 31.5 + 1.5 = 33px
        return getRectEdgeDistance(halfWidth, halfHeight, angle);
    } else {
        // 일반 노드: 원형 (node-size = 120px)
        // 테두리 중앙까지 = 반지름(60) + 테두리절반(1.5) = 61.5px
        return (120 / 2) + borderOffset;
    }
}

// 연결선 그리기 함수
function drawLinks() {
    const nodesToUse = window.nodes || nodes || [];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    links.forEach(link => {
        const source = nodesToUse.find(n => n.id === link.source);
        const target = nodesToUse.find(n => n.id === link.target);

        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 각도 계산
        const angle = Math.atan2(dy, dx);
        const reverseAngle = Math.atan2(-dy, -dx);

        // 각 노드의 실제 크기에 맞게 반지름 계산 (각도 전달)
        const sourceRadius = getNodeRadius(source, angle);
        const targetRadius = getNodeRadius(target, reverseAngle);

        // 노드 테두리에서 시작하고 끝나도록 계산
        const startX = source.x + Math.cos(angle) * sourceRadius;
        const startY = source.y + Math.sin(angle) * sourceRadius;
        const endX = target.x - Math.cos(angle) * targetRadius;
        const endY = target.y - Math.sin(angle) * targetRadius;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);

        // 폴더 색상으로 연결선 색상 설정
        const linkColor = link.isFolder ? getFolderColor(source.folderPath || source.folder || '/') : '#FFFFFF';
        line.setAttribute('stroke', linkColor);

        const lineWidth = Math.max(2, Math.min(4, 2 * (state.transform?.scale || 1)));
        line.setAttribute('stroke-width', lineWidth.toString());

        let opacity;
        if (link.isDragging) {
            opacity = 0.4;
        } else {
            const maxDistance = 800;
            const minOpacity = 0.3;
            opacity = Math.max(minOpacity, 1 - (distance / maxDistance));
        }

        line.setAttribute('stroke-opacity', opacity);
        svg.appendChild(line);
    });

    return svg;
}

// 초기 위치 설정을 위한 함수
function initCanvas() {
    const canvas = document.getElementById('canvas');
    const canvasSize = 100000;
    const centerOffset = canvasSize / 2;

    canvas.style.position = 'absolute';
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    canvas.style.left = `${-centerOffset + (window.innerWidth / 2)}px`;
    canvas.style.top = `${-centerOffset + (window.innerHeight / 2)}px`;
    canvas.style.transform = 'translate(0, 0) scale(1)';
    canvas.style.transformOrigin = '50% 50%';

    nodes.forEach(node => {
        node.x += centerOffset;
        node.y += centerOffset;
        node.baseX = node.x;
        node.baseY = node.y;
    });
}

// 노드 물리 효과 업데이트 함수
let animationRunning = false;
let floatingAnimationId = null;

function updateFloating() {
    const nodesToUse = window.nodes || nodes || [];

    // 조건이 맞지 않으면 중단
    if (state.floatingEnabled === false) {
        animationRunning = false;
        return;
    }

    // 노드가 없으면 다음 프레임에서 다시 시도
    if (!nodesToUse.length) {
        floatingAnimationId = requestAnimationFrame(updateFloating);
        return;
    }

    animationRunning = true;
    state.time += 0.016; // 약 60fps 기준

    nodesToUse.forEach(node => {
        if (node.isFixed || node.isEditing || node.isDragging) return;

        // 초기 속도값이 없으면 설정
        if (node.vx === undefined) node.vx = 0;
        if (node.vy === undefined) node.vy = 0;
        if (node.phase === undefined) node.phase = Math.random() * Math.PI * 2;

        // 부드러운 부유 효과 (사인 함수 기반)
        const floatAmplitude = 0.3; // 부유 강도
        const floatSpeed = 0.5; // 부유 속도
        node.vx += Math.sin(state.time * floatSpeed + node.phase) * floatAmplitude * 0.01;
        node.vy += Math.cos(state.time * floatSpeed * 0.7 + node.phase) * floatAmplitude * 0.01;

        // 노드 간 충돌 처리
        nodesToUse.forEach(otherNode => {
            if (node === otherNode) return;

            const dx = otherNode.x - node.x;
            const dy = otherNode.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const minDistance = 150;

            if (distance < minDistance && distance > 0) {
                const overlap = minDistance - distance;
                const force = overlap * 0.005;
                const angle = Math.atan2(dy, dx);

                if (!otherNode.isFixed && !otherNode.isDragging) {
                    otherNode.vx += Math.cos(angle) * force;
                    otherNode.vy += Math.sin(angle) * force;
                }
                if (!node.isFixed && !node.isDragging) {
                    node.vx -= Math.cos(angle) * force;
                    node.vy -= Math.sin(angle) * force;
                }
            }
        });

        // 기준점으로 돌아가려는 힘 (약하게)
        if (node.baseX !== undefined && node.baseY !== undefined) {
            const returnForce = 0.001;
            node.vx += (node.baseX - node.x) * returnForce;
            node.vy += (node.baseY - node.y) * returnForce;
        }

        // 속도 감쇠
        node.vx *= 0.98;
        node.vy *= 0.98;

        // 최대 속도 제한
        const maxSpeed = 0.8;
        const currentSpeed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (currentSpeed > maxSpeed) {
            node.vx = (node.vx / currentSpeed) * maxSpeed;
            node.vy = (node.vy / currentSpeed) * maxSpeed;
        }

        // 위치 업데이트 (드래그 중이 아닐 때만)
        if (!node.isDragging) {
            node.x += node.vx;
            node.y += node.vy;

            // DOM 요소도 업데이트
            const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
            if (nodeElement) {
                nodeElement.style.left = node.x + 'px';
                nodeElement.style.top = node.y + 'px';
            }
        }
    });

    // 링크 업데이트 및 렌더링
    updateLinks();
    render();

    animationRunning = false;

    // 다음 프레임 예약
    if (state.floatingEnabled !== false) {
        floatingAnimationId = requestAnimationFrame(updateFloating);
    }
}

// 부유 애니메이션 시작 함수
function startFloating() {
    state.floatingEnabled = true;
    if (!animationRunning) {
        updateFloating();
    }
}

// 부유 애니메이션 정지 함수
function stopFloating() {
    state.floatingEnabled = false;
    if (floatingAnimationId) {
        cancelAnimationFrame(floatingAnimationId);
        floatingAnimationId = null;
    }
}

// render 함수
let renderScheduled = false;

function render() {
    if (renderScheduled) return;
    
    renderScheduled = true;
    requestAnimationFrame(() => {
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            renderScheduled = false;
            return;
        }

        const nodesToRender = window.nodes || nodes || [];
        
        // 노드 수 로깅 (간소화)
        if (nodesToRender.length > 50) {
            console.warn('렌더링 성능 주의: 노드가 많습니다 (' + nodesToRender.length + '개)');
        }
        
        const existingNodes = new Map();
        canvas.querySelectorAll('.node').forEach(nodeElement => {
            const nodeId = nodeElement.getAttribute('data-id');
            if (nodeId) {
                existingNodes.set(nodeId, nodeElement);
            }
        });

        // 삭제된 노드들 제거
        existingNodes.forEach((element, nodeId) => {
            const nodeIdNum = parseFloat(nodeId);
            const nodeExists = nodesToRender.some(n => 
                n && (n.id === nodeIdNum || n.id.toString() === nodeId)
            );
            
            if (!nodeExists) {
                element.remove();
                existingNodes.delete(nodeId);
            }
        });

        // 링크 업데이트 - 먼저 링크 배열 갱신
        updateLinks();

        const existingSvg = canvas.querySelector('svg');
        if (existingSvg) {
            existingSvg.remove();
        }
        canvas.appendChild(drawLinks());
        
        // 노드 업데이트 또는 생성
        nodesToRender.forEach(node => {
            if (!node || node.id === null || node.id === undefined || isNaN(node.id)) {
                return;
            }
            
            const nodeId = node.id.toString();
            const existingElement = existingNodes.get(nodeId);
            
            if (existingElement) {
                // 기존 노드 업데이트 (단, 드래그 중이 아닐 때만)
                if (!node.isDragging) {
                    existingElement.style.left = node.x + 'px';
                    existingElement.style.top = node.y + 'px';
                }

                const titleElement = existingElement.querySelector('.title');
                if (titleElement) {
                    const truncatedTitle = node.title && node.title.length > 100
                        ? node.title.substring(0, 100) + '...'
                        : node.title || '';
                    titleElement.textContent = truncatedTitle;

                    // 텍스트 색상 업데이트
                    const textColor = node.titleColor || node.emotion || '#FFFFFF';
                    titleElement.style.color = textColor;
                }

                // 테두리 색상 업데이트
                // 테두리 색상 결정 - node.borderColor가 있으면 우선 적용
                let borderColor;
                if (node.borderColor) {
                    // 사용자 지정 테두리 색상 우선 (폴더, 일반 노드 모두)
                    borderColor = node.borderColor;
                    // AI 생성 노드 디버그 로그
                    if (node.aiGenerated) {
                        console.log(`🎨 AI노드 테두리: ${node.title?.substring(0, 10)} depth=${node.depth} color=${borderColor}`);
                    }
                } else if (node.isFolder) {
                    // 폴더 노드: 자신의 폴더 경로 색상
                    borderColor = getFolderColor(node.folderPath || node.folder || '/');
                } else if (node.folder && node.folder !== '/') {
                    // 특정 폴더에 속한 노드: 폴더 색상
                    borderColor = getFolderColor(node.folder);
                } else {
                    // 일반 노드: 기본 폴더 색상
                    borderColor = getFolderColor('/');
                }
                existingElement.style.border = `3px solid ${borderColor}`;
                existingElement.style.setProperty('--node-border-color', borderColor);
                existingElement.style.setProperty('--border-color', borderColor);

                // 날짜 요소 업데이트
                if (!node.isFolder) {
                    const existingDateElement = existingElement.querySelector('.node-date-internal');
                    if (existingDateElement) {
                        existingDateElement.remove();
                    }

                    if (node.date) {
                        let displayDate = '';
                        try {
                            let dateObj = node.date instanceof Date ? node.date : new Date(node.date);
                            if (!isNaN(dateObj.getTime())) {
                                displayDate = dateObj.toLocaleDateString('ko-KR', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    weekday: 'short'
                                });
                            }
                        } catch (error) {
                            console.error('기존 노드 날짜 파싱 오류:', error);
                        }

                        if (displayDate && displayDate !== '') {
                            const dateElement = document.createElement('div');
                            dateElement.className = 'node-date-internal';
                            dateElement.textContent = displayDate;

                            const nodeBorderColor = getFolderColor(node.folder || '/');
                            dateElement.style.cssText = `
                                background: ${nodeBorderColor};
                                color: black;
                                font-size: 12px;
                                padding: 2px 6px;
                                border-radius: 8px;
                                margin-top: 4px;
                                text-align: center;
                                font-weight: bold;
                                letter-spacing: -0.3px;
                                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                            `;

                            existingElement.appendChild(dateElement);
                        }
                    }
                }
            } else {
                // 새 노드 생성
                const newElement = createNodeElement(node);
                if (newElement) {
                    canvas.appendChild(newElement);
                }
            }
        });
        
        renderScheduled = false;
    });
}

// 트렌디한 날짜 표시 테스트 함수
window.testTrendyDates = () => {
    console.log('=== 트렌디한 날짜 표시 테스트 ===');
    const nodesToUse = window.nodes || nodes || [];
    const today = new Date().toISOString().split('T')[0];
    let updatedCount = 0;
    
    nodesToUse.forEach(node => {
        if (!node.isFolder) {
            node.date = today;
            updatedCount++;
            console.log(`노드 ${node.id} (${node.title})에 날짜 ${today} 추가`);
        }
    });
    
    render();
    
    console.log(`=== 총 ${updatedCount}개 노드에 날짜 추가 완료 ===`);
    return updatedCount;
};

// 하위 폴더 생성 함수
async function createSubFolder(parentFolderNode) {
    const folderName = prompt('새 폴더 이름을 입력하세요:');
    if (!folderName || !folderName.trim()) return;

    const nodesToUse = window.nodes || nodes || [];
    const now = new Date();
    const nodeId = Date.now();

    // 부모 폴더 경로 기준으로 새 폴더 경로 생성
    const parentPath = parentFolderNode.folderPath || '/';
    const newFolderPath = parentPath === '/' ? `/${folderName.trim()}` : `${parentPath}/${folderName.trim()}`;

    // 새 폴더 노드 위치 계산 (부모 근처에 배치)
    const offsetX = (Math.random() - 0.5) * 200;
    const offsetY = 150 + Math.random() * 100;

    const newFolderNode = {
        id: nodeId,
        title: folderName.trim(),
        content: '',
        x: parentFolderNode.x + offsetX,
        y: parentFolderNode.y + offsetY,
        baseX: parentFolderNode.x + offsetX,
        baseY: parentFolderNode.y + offsetY,
        folder: parentPath, // 부모 폴더에 속함
        folderPath: newFolderPath, // 이 폴더의 경로
        isFolder: true,
        emotion: 'default',
        date: formatDateToISO(now),
        vx: 0,
        vy: 0,
        mass: 1,
        phase: Math.random() * Math.PI * 2,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };

    try {
        // Firebase에 저장
        if (window.FirebaseManager) {
            await window.FirebaseManager.saveNode(newFolderNode);
        }

        // 로컬 배열에 추가
        nodesToUse.push(newFolderNode);

        // UI 업데이트
        updateLinks();
        render();
        if (typeof renderFolderTree === 'function') renderFolderTree();

        NodeManager.showErrorNotification(`'${folderName.trim()}' 폴더가 생성되었습니다.`, 'success');
    } catch (error) {
        console.error('하위 폴더 생성 중 오류:', error);
        NodeManager.showErrorNotification('폴더 생성에 실패했습니다.', 'error');
    }
}

// 하위 노드 생성 함수
async function createSubNode(parentFolderNode) {
    const nodesToUse = window.nodes || nodes || [];
    const now = new Date();
    const nodeId = Date.now();

    // 부모 폴더 경로
    const parentPath = parentFolderNode.folderPath || '/';

    // 새 노드 위치 계산 (부모 근처에 배치)
    const offsetX = (Math.random() - 0.5) * 200;
    const offsetY = 150 + Math.random() * 100;

    const newNode = {
        id: nodeId,
        title: '',
        content: '',
        x: parentFolderNode.x + offsetX,
        y: parentFolderNode.y + offsetY,
        baseX: parentFolderNode.x + offsetX,
        baseY: parentFolderNode.y + offsetY,
        folder: parentPath, // 부모 폴더에 속함
        emotion: 'default',
        date: formatDateToISO(now),
        vx: 0,
        vy: 0,
        mass: 1,
        phase: Math.random() * Math.PI * 2,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };

    try {
        // Firebase에 저장
        if (window.FirebaseManager) {
            await window.FirebaseManager.saveNode(newNode);
        }

        // 로컬 배열에 추가
        nodesToUse.push(newNode);

        // UI 업데이트
        updateLinks();
        render();

        // 에디터 열기
        setTimeout(() => {
            if (typeof openEditor === 'function') {
                openEditor(newNode);
            }
        }, 100);

        NodeManager.showErrorNotification('새 노드가 생성되었습니다.', 'success');
    } catch (error) {
        console.error('하위 노드 생성 중 오류:', error);
        NodeManager.showErrorNotification('노드 생성에 실패했습니다.', 'error');
    }
}

// 전역 함수로 노출
window.NodeManager = NodeManager;
window.createSubFolder = createSubFolder;
window.createSubNode = createSubNode; 