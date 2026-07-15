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
    if (!title) return '14px';
    
    const length = title.length;
    let fontSize;
    
    if (isFolder) {
        if (length <= 3) fontSize = 18;
        else if (length <= 6) fontSize = 16;
        else if (length <= 10) fontSize = 14;
        else if (length <= 15) fontSize = 12;
        else fontSize = 10;
    } else {
        // Keep regular node titles consistent with the 14px component default.
        // Only shrink long titles instead of enlarging short titles.
        if (length <= 25) fontSize = 14;
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
    div.classList.toggle('highlighted-node', !!node.highlighted);

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
                <button class="link-folder-btn"><span class="ctx-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></span>연결</button>
                <button class="add-subnode-btn"><span class="ctx-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></span>하위 노드 추가</button>
                <div class="context-menu-divider"></div>
                <button class="change-text-color-btn"><span class="ctx-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l7-16 7 16"/><path d="M8 14h8"/></svg></span>텍스트 색상</button>
                <button class="change-border-color-btn"><span class="ctx-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></span>테두리 색상</button>
                <div class="context-menu-divider"></div>
                <button class="rename-btn"><span class="ctx-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></span>이름 변경</button>
                <button class="delete-btn"><span class="ctx-ico"><s