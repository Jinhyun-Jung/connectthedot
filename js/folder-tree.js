// 폴더 경로 정규화: undefined/null/빈문자열 → '/', 슬래시 누락/중복/후행 슬래시 보정
function normalizeFolderPath(folder) {
    if (!folder || typeof folder !== 'string') return '/';
    let trimmed = folder.trim();
    if (!trimmed) return '/';
    // 후행 슬래시 제거
    while (trimmed.length > 1 && trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
    if (trimmed === '/' || trimmed === '') return '/';
    // 선행 슬래시 보장
    if (!trimmed.startsWith('/')) trimmed = '/' + trimmed;
    // 중복 슬래시 정리
    return trimmed.replace(/\/+/g, '/');
}

// 캔버스에 렌더링되는 노드와 동일한 유효성 기준
function isCanvasRenderable(node) {
    return !!(node && node.id !== null && node.id !== undefined && !isNaN(node.id));
}

// 폴더 트리 렌더링 함수
function renderFolderTree() {
    // window.nodes를 우선적으로 사용, 없으면 로컬 nodes 사용
    const nodesToRender = window.nodes || nodes || [];

    console.log('폴더트리 렌더링 시작:', {
        windowNodesCount: window.nodes?.length,
        localNodesCount: nodes?.length,
        nodesToRenderCount: nodesToRender.length
    });

    const structure = folderStructure.buildFromNodes();
    const folderList = document.querySelector('.folder-list');

    // 폴더뷰 타이틀 로드 (localStorage에서)
    const folderViewTitle = document.getElementById('folderViewTitle');
    if (folderViewTitle) {
        const savedTitle = localStorage.getItem('folderViewTitle') || 'Connect Dots';
        folderViewTitle.textContent = savedTitle;
    }

    // 캔버스에 보이는 노드들을 정규화된 폴더 경로별로 그룹화 (폴더 노드 포함)
    const nodesByFolder = new Map();
    nodesToRender.forEach(node => {
        if (!isCanvasRenderable(node)) return;
        const path = node.isFolder
            ? normalizeFolderPath(node.folder)        // 폴더 노드 자신이 위치한 부모 경로
            : normalizeFolderPath(node.folder);
        if (!nodesByFolder.has(path)) nodesByFolder.set(path, []);
        nodesByFolder.get(path).push(node);
    });

    let html = '';

    // 루트 폴더
    const rootEntries = nodesByFolder.get('/') || [];
    html += `
        <div class="folder-item ${state.selectedFolder === '/' ? 'active' : ''}"
             data-path="/"
             data-expanded="true"
             draggable="true">
            <span class="folder-icon">⭐</span>
            <span class="folder-name">우주</span>
            <span class="folder-count">${rootEntries.length}</span>
        </div>
    `;

    // 루트의 직접적인 노드 (isFolder는 트리에서 폴더로 표시되므로 제외)
    rootEntries
        .filter(node => !node.isFolder)
        .forEach(node => {
            const nodeTitle = (node.title && node.title.trim()) || '(제목 없음)';
            html += `
                <div class="node-item"
                     data-node-id="${node.id}"
                     draggable="true">
                    <span class="folder-icon">-</span>
                    <span class="node-name">${nodeTitle}</span>
                </div>
            `;
        });

    // 폴더 구조 생성
    function buildFolderHTML(obj, path = '', depth = 0) {
        let folderHtml = '';
        for (let key in obj) {
            const currentPath = path + '/' + key;
            const entries = nodesByFolder.get(currentPath) || [];
            const nodeCount = entries.length;
            const hasChildren = Object.keys(obj[key]).length > 0;
            const indent = ''.repeat(depth);
            const isExpanded = localStorage.getItem(`folder-${currentPath}`) !== 'collapsed';

            folderHtml += `
                <div class="folder-item ${state.selectedFolder === currentPath ? 'active' : ''}"
                     data-path="${currentPath}"
                     data-expanded="${isExpanded}"
                     draggable="true">
                    ${indent}<span class="folder-icon">${isExpanded ? '📂' : '📁'}</span>
                    <span class="folder-name">${key}</span>
                    <span class="folder-count">${nodeCount}</span>
                </div>
            `;

            if (isExpanded) {
                entries
                    .filter(node => !node.isFolder)
                    .forEach(node => {
                        const nodeTitle = (node.title && node.title.trim()) || '(제목 없음)';
                        folderHtml += `
                            <div class="node-item"
                                 data-node-id="${node.id}"
                                 draggable="true">
                                ${indent}　<span class="folder-icon">-</span>
                                <span class="node-name">${nodeTitle}</span>
                            </div>
                        `;
                    });

                if (hasChildren) {
                    folderHtml += buildFolderHTML(obj[key], currentPath, depth + 1);
                }
            }
        }
        return folderHtml;
    }

    html += buildFolderHTML(structure);

    // 트리에 잡히지 않은 경로(folder 경로가 어디 폴더에도 매칭되지 않는 고아 노드)를
    // "기타" 그룹으로 마지막에 추가하여 캔버스와의 누락을 방지
    const knownPaths = new Set(['/']);
    (function collectPaths(obj, parent = '') {
        for (const k in obj) {
            const p = parent + '/' + k;
            knownPaths.add(p);
            collectPaths(obj[k], p);
        }
    })(structure);

    const orphanNodes = [];
    nodesByFolder.forEach((arr, path) => {
        if (knownPaths.has(path)) return;
        arr.filter(n => !n.isFolder).forEach(n => orphanNodes.push({ path, node: n }));
    });

    if (orphanNodes.length > 0) {
        html += `
            <div class="folder-item" data-path="__orphan__" data-expanded="true">
                <span class="folder-icon">❔</span>
                <span class="folder-name">기타</span>
                <span class="folder-count">${orphanNodes.length}</span>
            </div>
        `;
        orphanNodes.forEach(({ node }) => {
            const nodeTitle = (node.title && node.title.trim()) || '(제목 없음)';
            html += `
                <div class="node-item"
                     data-node-id="${node.id}"
                     draggable="true">
                    <span class="folder-icon">-</span>
                    <span class="node-name">${nodeTitle}</span>
                </div>
            `;
        });
    }

    folderList.innerHTML = html;
    initFolderTreeEvents();
}

// 폴더 트리 이벤트 초기화 함수
function initFolderTreeEvents() {
    const folderList = document.querySelector('.folder-list');
    const folderHeader = document.querySelector('.folder-header');
    
    // 폴더 헤더 버튼 이벤트 (이벤트 위임) - 닫기 버튼만 처리
    if (folderHeader) {
        folderHeader.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;
            
            const action = button.dataset.action;
            if (action === 'close-folder') {
                if (typeof toggleFolderView === 'function') {
                    toggleFolderView();
                }
            }
        });
    }
    
    // 폴더 및 노드 클릭 이벤트 (이벤트 위임)
    if (folderList) {
        // 좌클릭 이벤트
        folderList.addEventListener('click', (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                const path = folderItem.dataset.path;
                const isExpanded = folderItem.dataset.expanded === 'true';
                localStorage.setItem(`folder-${path}`, isExpanded ? 'collapsed' : 'expanded');
                renderFolderTree();
                return;
            }

            const nodeItem = e.target.closest('.node-item');
            if (nodeItem) {
                const nodeId = nodeItem.dataset.nodeId;
                const nodesToSearch = window.nodes || nodes || [];
                const node = nodesToSearch.find(n => n.id == nodeId);
                if (node) {
                    if (node.isSpreadsheet && typeof openSpreadsheetEditor === 'function') {
                        openSpreadsheetEditor(node);
                    } else if (typeof openEditor === 'function') {
                        openEditor(node);
                    }
                }
            }
        });

        // 휠(중간 버튼) 드래그로 폴더뷰 패닝/스크롤 - document 리스너는 1회만 등록
        if (!window.__folderPanInit) {
            window.__folderPanInit = true;
            window.__folderPanState = null;

            document.addEventListener('mousemove', (e) => {
                const s = window.__folderPanState;
                if (!s) return;
                e.preventDefault();
                s.target.scrollTop = s.startScrollTop - (e.clientY - s.startY);
                s.target.scrollLeft = s.startScrollLeft - (e.clientX - s.startX);
            });

            const endPan = () => {
                const s = window.__folderPanState;
                if (!s) return;
                s.target.classList.remove('dragging-pan');
                window.__folderPanState = null;
            };
            document.addEventListener('mouseup', endPan);
            window.addEventListener('blur', endPan);
        }

        folderList.addEventListener('mousedown', (e) => {
            if (e.button !== 1) return;
            e.preventDefault();
            window.__folderPanState = {
                target: folderList,
                startY: e.clientY,
                startX: e.clientX,
                startScrollTop: folderList.scrollTop,
                startScrollLeft: folderList.scrollLeft
            };
            folderList.classList.add('dragging-pan');
        });

        // 중간 버튼 클릭 시 브라우저 기본 자동 스크롤(autoscroll) 방지
        folderList.addEventListener('auxclick', (e) => {
            if (e.button === 1) e.preventDefault();
        });

        // 우클릭 컨텍스트 메뉴 이벤트
        folderList.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 기존 컨텍스트 메뉴 제거
            const existingMenu = document.querySelector('.folder-context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const folderItem = e.target.closest('.folder-item');
            const nodeItem = e.target.closest('.node-item');

            if (folderItem) {
                showFolderContextMenu(e, folderItem);
            } else if (nodeItem) {
                showNodeContextMenu(e, nodeItem);
            }
        });
    }
}

// 폴더 컨텍스트 메뉴 표시
function showFolderContextMenu(event, folderItem) {
    const path = folderItem.dataset.path;
    const folderName = folderItem.querySelector('.folder-name').textContent;
    
    // 루트 폴더는 삭제/수정 불가
    if (path === '/') {
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'folder-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 120px;
        padding: 4px 0;
    `;

    menu.innerHTML = `
        <button class="context-menu-item" data-action="add-folder">
            <span>📁</span> 폴더 추가
        </button>
        <button class="context-menu-item" data-action="add-node">
            <span>📄</span> 노드 추가
        </button>
        <button class="context-menu-item" data-action="rename">
            <span>📝</span> 이름 수정
        </button>
        <button class="context-menu-item" data-action="delete">
            <span>🗑️</span> 폴더 삭제
        </button>
    `;

    // 이벤트 리스너
    menu.addEventListener('click', async (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        menu.remove();

        if (action === 'add-folder') {
            const newFolderName = prompt('새 폴더 이름을 입력하세요:');
            if (newFolderName && newFolderName.trim()) {
                await createSubFolderInPath(path, newFolderName.trim());
            }
        } else if (action === 'add-node') {
            await createNodeInFolder(path);
        } else if (action === 'rename') {
            const newName = prompt('새 폴더 이름을 입력하세요:', folderName);
            if (newName && newName.trim() && newName !== folderName) {
                await renameFolderPath(path, newName.trim());
            }
        } else if (action === 'delete') {
            if (confirm(`"${folderName}" 폴더와 내부의 모든 노드를 삭제하시겠습니까?`)) {
                await deleteFolderPath(path);
            }
        }
    });

    document.body.appendChild(menu);
    addContextMenuCloseHandler(menu);
}

// 노드 컨텍스트 메뉴 표시
function showNodeContextMenu(event, nodeItem) {
    const nodeId = nodeItem.dataset.nodeId;
    // window.nodes를 우선적으로 사용
    const nodesToSearch = window.nodes || nodes || [];
    const node = nodesToSearch.find(n => n.id == nodeId);
    
    if (!node) {
        console.error('노드를 찾을 수 없습니다:', nodeId);
        return;
    }

    const menu = document.createElement('div');
    menu.className = 'folder-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        min-width: 120px;
        padding: 4px 0;
    `;

    // 노드가 속한 폴더 경로
    const nodeFolder = node.folder || '/';

    menu.innerHTML = `
        <button class="context-menu-item" data-action="add-folder">
            <span>📁</span> 폴더 추가
        </button>
        <button class="context-menu-item" data-action="add-node">
            <span>📄</span> 노드 추가
        </button>
        <button class="context-menu-item" data-action="edit">
            <span>✏️</span> 편집
        </button>
        <button class="context-menu-item" data-action="delete">
            <span>🗑️</span> 삭제
        </button>
    `;

    // 이벤트 리스너
    menu.addEventListener('click', async (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        menu.remove();

        if (action === 'add-folder') {
            const newFolderName = prompt('새 폴더 이름을 입력하세요:');
            if (newFolderName && newFolderName.trim()) {
                await createSubFolderInPath(nodeFolder, newFolderName.trim());
            }
        } else if (action === 'add-node') {
            await createNodeInFolder(nodeFolder);
        } else if (action === 'edit') {
            if (node.isSpreadsheet && typeof openSpreadsheetEditor === 'function') {
                openSpreadsheetEditor(node);
            } else if (typeof openEditor === 'function') {
                openEditor(node);
            }
        } else if (action === 'delete') {
            try {
                await FirebaseManager.deleteNode(node.id);
                console.log('노드 삭제 완료:', node.id);
            } catch (error) {
                console.error('노드 삭제 실패:', error);
                alert('노드 삭제에 실패했습니다.');
            }
        }
    });

    document.body.appendChild(menu);
    addContextMenuCloseHandler(menu);
}

// 컨텍스트 메뉴 닫기 핸들러
function addContextMenuCloseHandler(menu) {
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    // 약간의 지연 후 이벤트 리스너 추가 (즉시 닫히는 것 방지)
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);

    // ESC 키로 닫기
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            menu.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// 폴더 이름 변경 함수
async function renameFolderPath(oldPath, newName) {
    try {
        const pathParts = oldPath.split('/');
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');

        // window.nodes를 우선적으로 사용
        const nodesToUpdate = (window.nodes || nodes || []).filter(node => 
            node && (node.folder === oldPath || node.folder.startsWith(oldPath + '/'))
        );

        for (const node of nodesToUpdate) {
            const oldFolder = node.folder;
            const newFolder = oldFolder.replace(oldPath, newPath);
            node.folder = newFolder;
            
            // 폴더 노드의 경우 folderPath도 업데이트
            if (node.isFolder && node.folderPath === oldPath) {
                node.folderPath = newPath;
            }
            
            node.updatedAt = new Date().toISOString();
            await FirebaseManager.saveNode(node);
        }

        // UI 업데이트
        renderFolderTree();
        if (typeof render === 'function') render();
        
        console.log('폴더 이름 변경 완료:', oldPath, '→', newPath);
    } catch (error) {
        console.error('폴더 이름 변경 실패:', error);
        alert('폴더 이름 변경에 실패했습니다.');
    }
}

// 폴더 삭제 함수
async function deleteFolderPath(folderPath) {
    try {
        // window.nodes를 우선적으로 사용
        const nodesToDelete = (window.nodes || nodes || []).filter(node =>
            node && (node.folder === folderPath || node.folder.startsWith(folderPath + '/'))
        );

        // 모든 노드 삭제
        for (const node of nodesToDelete) {
            await FirebaseManager.deleteNode(node.id);
        }

        // UI 업데이트
        renderFolderTree();
        if (typeof render === 'function') render();

        console.log('폴더 삭제 완료:', folderPath, '노드 수:', nodesToDelete.length);
    } catch (error) {
        console.error('폴더 삭제 실패:', error);
        alert('폴더 삭제에 실패했습니다.');
    }
}

// 특정 폴더 경로에 하위 폴더 추가
async function createSubFolderInPath(parentPath, folderName) {
    try {
        const newFolderPath = parentPath === '/' ? `/${folderName}` : `${parentPath}/${folderName}`;

        // 폴더 노드 생성
        const now = new Date();
        const folderNode = {
            id: Date.now(),
            title: folderName,
            content: '',
            date: now.toISOString().split('T')[0],
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100,
            baseX: 0,
            baseY: 0,
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

        folderNode.baseX = folderNode.x;
        folderNode.baseY = folderNode.y;

        // Firebase에 저장
        await FirebaseManager.saveNode(folderNode);

        // UI 업데이트
        renderFolderTree();
        if (typeof render === 'function') render();

        console.log('하위 폴더 생성 완료:', newFolderPath);
    } catch (error) {
        console.error('하위 폴더 생성 실패:', error);
        alert('폴더 생성에 실패했습니다.');
    }
}

// 특정 폴더에 노드 추가
async function createNodeInFolder(folderPath) {
    try {
        const now = new Date();
        const newNode = {
            id: Date.now(),
            title: '새 노드',
            content: '',
            date: now.toISOString().split('T')[0],
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100,
            baseX: 0,
            baseY: 0,
            phase: Math.random() * Math.PI * 2,
            emotion: '#F59E0B',
            folder: folderPath,
            vx: 0,
            vy: 0,
            mass: 1,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        newNode.baseX = newNode.x;
        newNode.baseY = newNode.y;

        // Firebase에 저장
        await FirebaseManager.saveNode(newNode);

        // UI 업데이트
        renderFolderTree();
        if (typeof render === 'function') render();

        // 새 노드 에디터 열기
        if (typeof openEditor === 'function') {
            // 약간의 지연 후 에디터 열기 (노드가 렌더링된 후)
            setTimeout(() => {
                const nodesToSearch = window.nodes || [];
                const createdNode = nodesToSearch.find(n => n.id === newNode.id);
                if (createdNode) {
                    openEditor(createdNode);
                }
            }, 100);
        }

        console.log('노드 생성 완료:', newNode.id, 'in folder:', folderPath);
    } catch (error) {
        console.error('노드 생성 실패:', error);
        alert('노드 생성에 실패했습니다.');
    }
}

// 폴더뷰 타이틀 편집 함수
function editFolderViewTitle() {
    const titleElement = document.getElementById('folderViewTitle');
    if (!titleElement) return;

    const currentTitle = titleElement.textContent;

    // 입력 필드 생성
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'folder-view-title-input';
    input.style.cssText = `
        font-size: 14px;
        font-weight: 600;
        color: #333;
        padding: 4px 8px;
        border: 2px solid #667eea;
        border-radius: 4px;
        outline: none;
        width: 120px;
    `;

    // 타이틀을 입력 필드로 교체
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(input, titleElement);
    input.focus();
    input.select();

    // 저장 함수
    const saveTitle = () => {
        const newTitle = input.value.trim() || 'Connect Dots';
        titleElement.textContent = newTitle;
        titleElement.style.display = '';
        input.remove();

        // localStorage에 저장
        localStorage.setItem('folderViewTitle', newTitle);
        console.log('폴더뷰 타이틀 저장:', newTitle);
    };

    // Enter 키로 저장
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveTitle();
        } else if (e.key === 'Escape') {
            titleElement.style.display = '';
            input.remove();
        }
    });

    // 포커스 잃으면 저장
    input.addEventListener('blur', saveTitle);
} 