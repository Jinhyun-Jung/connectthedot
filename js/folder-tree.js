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

    // 캔버스 우선: 폴더 표시 이름은 경로 조각이 아니라 폴더 노드의 실제 제목을 따른다.
    // (폴더 노드의 title 과 folderPath 끝 이름이 어긋난 데이터가 있어, 캔버스에 보이는 제목과 일치시킨다)
    const folderTitleByPath = new Map();
    nodesToRender.forEach(n => {
        if (n && n.isFolder && n.folderPath) {
            const p = normalizeFolderPath(n.folderPath);
            const title = (n.title && n.title.trim()) || p.split('/').pop();
            folderTitleByPath.set(p, title);
        }
    });

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

    // 루트(우주)는 캔버스에 실제 노드가 아니므로 폴더뷰에 표시하지 않는다.
    // 루트에 직접 있는 노드만 맨 위에 표시한다.
    const rootEntries = nodesByFolder.get('/') || [];

    // 루트의 직접적인 노드 (isFolder는 트리에서 폴더로 표시되므로 제외)
    rootEntries
        .filter(node => !node.isFolder)
        .forEach(node => {
            const nodeTitle = (node.title && node.title.trim()) || '(제목 없음)';
            html += `
                <div class="node-item ${node.checked ? 'checked' : ''}"
                     data-node-id="${node.id}"
                     draggable="true">
                    <input type="checkbox" class="node-check" ${node.checked ? 'checked' : ''} title="완료 표시">
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
            const nodeCount = entries.filter(n => !n.isFolder).length;
            const hasChildren = Object.keys(obj[key]).length > 0;
            const indent = ''.repeat(depth);
            const isExpanded = localStorage.getItem(`folder-${currentPath}`) !== 'collapsed';
            // 캔버스 우선: 폴더 노드 제목을 우선 표시 (없으면 경로 조각)
            const displayName = folderTitleByPath.get(normalizeFolderPath(currentPath)) || key;

            folderHtml += `
                <div class="folder-item ${state.selectedFolder === currentPath ? 'active' : ''}"
                     data-path="${currentPath}"
                     data-expanded="${isExpanded}"
                     draggable="true">
                    ${indent}<span class="folder-icon">${isExpanded ? '📂' : '📁'}</span>
                    <span class="folder-name">${displayName}</span>
                    <span class="folder-count">${nodeCount}</span>
                </div>
            `;

            if (isExpanded) {
                entries
                    .filter(node => !node.isFolder)
                    .forEach(node => {
                        const nodeTitle = (node.title && node.title.trim()) || '(제목 없음)';
                        folderHtml += `
                            <div class="node-item ${node.checked ? 'checked' : ''}"
                                 data-node-id="${node.id}"
                                 draggable="true">
                                <input type="checkbox" class="node-check" ${node.checked ? 'checked' : ''} title="완료 표시">
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

    // 메인 트리에서는 '아카이브'를 제외하고 그린다 (아카이브는 맨 아래 별도 표시)
    const mainStructure = {};
    for (const k in structure) { if (k !== '아카이브') mainStructure[k] = structure[k]; }
    html += buildFolderHTML(mainStructure);

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
                <div class="node-item ${node.checked ? 'checked' : ''}"
                     data-node-id="${node.id}"
                     draggable="true">
                    <input type="checkbox" class="node-check" ${node.checked ? 'checked' : ''} title="완료 표시">
                    <span class="node-name">${nodeTitle}</span>
                </div>
            `;
        });
    }

    // ===== 아카이브 (맨 아래, 접이식, 기본 접힘) =====
    const archiveExpanded = localStorage.getItem('folder-/아카이브') === 'expanded';
    const archivedCount = nodesToRender.filter(n => n && !n.isFolder && normalizeFolderPath(n.folder).startsWith('/아카이브')).length;
    if (archivedCount > 0 || structure['아카이브']) {
        html += `
            <div class="folder-item archive-item" data-path="/아카이브" data-expanded="${archiveExpanded}">
                <span class="folder-icon">🗄️</span>
                <span class="folder-name">아카이브</span>
                <span class="folder-count">${archivedCount}</span>
            </div>
        `;
        if (archiveExpanded) {
            // 아카이브 직속 노드
            (nodesByFolder.get('/아카이브') || []).filter(n => !n.isFolder).forEach(node => {
                const t = (node.title && node.title.trim()) || '(제목 없음)';
                html += `
                    <div class="node-item ${node.checked ? 'checked' : ''}" data-node-id="${node.id}" draggable="true">
                        <input type="checkbox" class="node-check" ${node.checked ? 'checked' : ''} title="완료 표시">
                        <span class="node-name">${t}</span>
                    </div>
                `;
            });
            // 아카이브 하위 구조 (원래 폴더 경로 그대로)
            if (structure['아카이브']) html += buildFolderHTML(structure['아카이브'], '/아카이브', 1);
        }
    }

    folderList.innerHTML = html;
    initFolderTreeEvents();
}

// 폴더뷰에서 선택한 노드를 캔버스 가운데로 이동시키고 반짝이게 강조
function locateNodeOnCanvas(node) {
    if (!node) return;
    const canvas = document.getElementById('canvas');
    if (!canvas || typeof canvasState === 'undefined') return;

    const scale = canvasState.scale || 1;
    const nodeX = (typeof node.x === 'number') ? node.x : 0;
    const nodeY = (typeof node.y === 'number') ? node.y : 0;

    // 노드가 화면 중앙에 오도록 캔버스 변환 계산
    canvasState.translateX = (window.innerWidth / 2) - (nodeX * scale);
    canvasState.translateY = (window.innerHeight / 2) - (nodeY * scale);
    if (canvasState.transform) {
        canvasState.transform.x = canvasState.translateX;
        canvasState.transform.y = canvasState.translateY;
    }

    // 부드럽게 이동
    canvas.style.transition = 'transform 0.45s ease';
    if (typeof applyTransform === 'function') {
        applyTransform();
    } else {
        canvas.style.transform = `translate(${canvasState.translateX}px, ${canvasState.translateY}px) scale(${scale})`;
    }
    setTimeout(() => { canvas.style.transition = ''; }, 520);

    // 해당 노드 DOM 강조(반짝임)
    let safeId = '';
    try { safeId = (window.CSS && CSS.escape) ? CSS.escape(String(node.id)) : String(node.id); }
    catch (e) { safeId = String(node.id); }
    const el = document.querySelector(`.node[data-id="${safeId}"]`);
    if (el) {
        el.classList.remove('locate-twinkle');
        void el.offsetWidth; // 애니메이션 재시작용 reflow
        el.classList.add('locate-twinkle');
        setTimeout(() => el.classList.remove('locate-twinkle'), 1700);
    }
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
            // 체크박스 클릭은 change 이벤트에서 처리 (노드 이동/열기 막기)
            if (e.target.classList && e.target.classList.contains('node-check')) {
                return;
            }

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
                    // 에디터를 열지 않고 캔버스에서 해당 노드를 가운데로 이동 + 반짝임
                    locateNodeOnCanvas(node);
                }
            }
        });

        // 더블클릭하면 에디터 열기 (편집 접근성 유지)
        folderList.addEventListener('dblclick', (e) => {
            if (e.target.classList && e.target.classList.contains('node-check')) return;
            const nodeItem = e.target.closest('.node-item');
            if (!nodeItem) return;
            const nodeId = nodeItem.dataset.nodeId;
            const nodesToSearch = window.nodes || nodes || [];
            const node = nodesToSearch.find(n => n.id == nodeId);
            if (!node) return;
            if (node.isSpreadsheet && typeof openSpreadsheetEditor === 'function') {
                openSpreadsheetEditor(node);
            } else if (typeof openEditor === 'function') {
                openEditor(node);
            }
        });

        // 체크박스 토글 + 드래그앤드롭 (한 번만 바인딩)
        if (!folderList.__dndChkInit) {
            folderList.__dndChkInit = true;

            // 체크박스 완료 토글
            folderList.addEventListener('change', async (e) => {
                if (!e.target.classList || !e.target.classList.contains('node-check')) return;
                const nodeItem = e.target.closest('.node-item');
                if (!nodeItem) return;
                const nodeId = nodeItem.dataset.nodeId;
                const nodesToSearch = window.nodes || nodes || [];
                const node = nodesToSearch.find(n => n.id == nodeId);
                if (!node) return;
                const checked = e.target.checked;
                node.checked = checked;
                // 체크: 아카이브 안의 '동일 폴더 경로'로 이동 / 해제: 원래 위치로 복원
                const cur = normalizeFolderPath(node.folder);
                if (checked) {
                    node.folder = (cur === '/') ? '/아카이브' : '/아카이브' + cur;
                } else if (cur === '/아카이브' || cur.startsWith('/아카이브/')) {
                    let f = cur.slice('/아카이브'.length) || '/';
                    if (!f.startsWith('/')) f = '/' + f;
                    node.folder = f;
                }
                // 캔버스/폴더뷰 즉시 반영
                if (typeof render === 'function') render();
                renderFolderTree();
                if (typeof FirebaseManager !== 'undefined' && FirebaseManager.saveNode) {
                    try { await FirebaseManager.saveNode(node); } catch (err) { console.error('체크 저장 실패:', err); }
                }
            });

            // 드래그앤드롭: 노드/폴더를 다른 폴더로 이동
            let dndData = null;

            folderList.addEventListener('dragstart', (e) => {
                if (e.target.classList && e.target.classList.contains('node-check')) {
                    e.preventDefault();
                    return;
                }
                const nodeItem = e.target.closest('.node-item');
                const folderItem = e.target.closest('.folder-item');
                if (nodeItem) {
                    dndData = { type: 'node', id: nodeItem.dataset.nodeId };
                    nodeItem.classList.add('dragging');
                } else if (folderItem) {
                    dndData = { type: 'folder', path: folderItem.dataset.path };
                    folderItem.classList.add('dragging');
                }
                if (dndData && e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', dndData.type + ':' + (dndData.id || dndData.path));
                }
            });

            folderList.addEventListener('dragover', (e) => {
                if (!dndData) return;
                const folderItem = e.target.closest('.folder-item');
                if (!folderItem) return;
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                document.querySelectorAll('.folder-item.drop-target').forEach(x => x.classList.remove('drop-target'));
                folderItem.classList.add('drop-target');
            });

            folderList.addEventListener('dragleave', (e) => {
                const folderItem = e.target.closest('.folder-item');
                if (folderItem) folderItem.classList.remove('drop-target');
            });

            folderList.addEventListener('drop', async (e) => {
                const folderItem = e.target.closest('.folder-item');
                document.querySelectorAll('.folder-item.drop-target').forEach(x => x.classList.remove('drop-target'));
                if (!folderItem || !dndData) { dndData = null; return; }
                e.preventDefault();
                const targetPath = folderItem.dataset.path;
                if (targetPath === '__orphan__') { dndData = null; return; }

                if (dndData.type === 'node') {
                    const nodesToSearch = window.nodes || nodes || [];
                    const node = nodesToSearch.find(n => n.id == dndData.id);
                    if (node && node.folder !== targetPath) {
                        node.folder = targetPath;
                        if (typeof FirebaseManager !== 'undefined' && FirebaseManager.saveNode) {
                            try { await FirebaseManager.saveNode(node); } catch (err) { console.error('노드 이동 저장 실패:', err); }
                        }
                        renderFolderTree();
                        if (typeof render === 'function') render();
                    }
                } else if (dndData.type === 'folder') {
                    const src = dndData.path;
                    // 자기 자신/하위로는 이동 금지, 루트 폴더는 이동 불가
                    if (src && src !== '/' && targetPath !== src && !targetPath.startsWith(src + '/')) {
                        if (typeof moveFolderTo === 'function') {
                            await moveFolderTo(src, targetPath);
                        }
                        renderFolderTree();
                    }
                }
                dndData = null;
            });

            folderList.addEventListener('dragend', () => {
                document.querySelectorAll('.dragging').forEach(x => x.classList.remove('dragging'));
                document.querySelectorAll('.folder-item.drop-target').forEach(x => x.classList.remove('drop-target'));
                dndData = null;
            });
        }

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
// 폴더와 그 하위(폴더/노드)를 통째로 아카이브로 이동 (폴더는 체크박스가 없으므로 메뉴로 처리)
async function archiveFolderPath(folderPath) {
    const ns = window.nodes || nodes || [];
    const P = normalizeFolderPath(folderPath);
    if (P === '/' || P === '/아카이브' || P.startsWith('/아카이브/')) return; // 루트/이미 아카이브 제외
    const changed = [];
    ns.forEach(n => {
        if (!n) return;
        let touched = false;
        // 폴더 노드: folderPath 가 P 이거나 하위
        if (n.isFolder && n.folderPath) {
            const fp = normalizeFolderPath(n.folderPath);
            if (fp === P || fp.startsWith(P + '/')) {
                n.folderPath = '/아카이브' + fp;
                n.folder = '/아카이브' + normalizeFolderPath(n.folder);
                n.checked = true;
                touched = true;
            }
        }
        // 일반 노드: folder 가 P 이거나 하위
        if (!n.isFolder && n.folder) {
            const f = normalizeFolderPath(n.folder);
            if (f === P || f.startsWith(P + '/')) {
                n.folder = '/아카이브' + f;
                n.checked = true;
                touched = true;
            }
        }
        if (touched) changed.push(n);
    });

    if (typeof FirebaseManager !== 'undefined' && FirebaseManager.saveNode) {
        for (const n of changed) {
            try { await FirebaseManager.saveNode(n); } catch (e) { console.error('폴더 아카이브 저장 실패:', e); }
        }
    }
    if (typeof render === 'function') render();
    renderFolderTree();
}

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
        <button class="context-menu-item" data-action="archive">
            <span>🗄️</span> 아카이브
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
        } else if (action === 'archive') {
            await archiveFolderPath(path);
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