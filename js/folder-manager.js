// 트리뷰 확장 상태 (기본: 축소)
let folderTreeExpanded = false;

// 폴더 경로 버튼 업데이트 함수 - 간결한 트리 뷰
function updateFolderPathButtons(path) {
    const folderButtons = document.querySelector('.folder-buttons');
    if (!folderButtons) return;

    // 폴더 구조 빌드
    let structure = {};
    if (typeof folderStructure !== 'undefined' && folderStructure.buildFromNodes) {
        structure = folderStructure.buildFromNodes();
    }

    // 트리 구조 HTML 생성
    let html = '';

    // 토글 버튼 추가
    html += `
        <button class="folder-tree-toggle" onclick="toggleFolderTreeView()">
            ${folderTreeExpanded ? '▼ 폴더 접기' : '▶ 폴더 펼치기'}
        </button>
    `;

    html += `<div class="folder-tree-view ${folderTreeExpanded ? 'expanded' : 'collapsed'}">`;

    // 루트 폴더 (우주)
    const rootColor = getFolderColor('/');
    const isRootSelected = path === '/';
    html += `
        <div class="folder-row ${isRootSelected ? 'selected' : ''}" data-path="/" draggable="false">
            <div class="folder-info">
                <span class="folder-dot" style="background-color: ${rootColor};"></span>
                <span class="folder-name">우주</span>
            </div>
            <button class="folder-add-btn" data-parent="/" title="하위 폴더 추가">+</button>
        </div>
    `;

    // 하위 폴더들 재귀적으로 생성
    html += buildFolderTree(structure, '/', path, 1);

    html += '</div>';

    folderButtons.innerHTML = html;

    // 이벤트 리스너 추가
    initFolderRowEvents();
}

// 폴더 트리뷰 토글 함수
function toggleFolderTreeView() {
    folderTreeExpanded = !folderTreeExpanded;
    updateFolderPathButtons(state.selectedFolder || '/');
}

// 폴더 트리 HTML 생성 (재귀)
function buildFolderTree(obj, parentPath, selectedPath, depth) {
    let html = '';
    const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b, 'ko'));

    keys.forEach(key => {
        const currentPath = parentPath === '/' ? '/' + key : parentPath + '/' + key;
        const folderColor = getFolderColor(currentPath);
        const isSelected = selectedPath === currentPath;
        const hasChildren = Object.keys(obj[key]).length > 0;
        const indent = depth * 20;

        html += `
            <div class="folder-row ${isSelected ? 'selected' : ''}"
                 data-path="${currentPath}"
                 draggable="true"
                 style="padding-left: ${indent}px;">
                <div class="folder-info">
                    <span class="folder-dot" style="background-color: ${folderColor};"></span>
                    <span class="folder-name">${key}</span>
                </div>
                <button class="folder-add-btn" data-parent="${currentPath}" title="하위 폴더 추가">+</button>
            </div>
        `;

        // 하위 폴더 재귀
        if (hasChildren) {
            html += buildFolderTree(obj[key], currentPath, selectedPath, depth + 1);
        }
    });

    return html;
}

// 폴더 행 이벤트 초기화
function initFolderRowEvents() {
    const rows = document.querySelectorAll('.folder-row');

    rows.forEach(row => {
        // 클릭으로 폴더 선택
        row.addEventListener('click', function(e) {
            if (e.target.classList.contains('folder-add-btn')) return;

            const selectedPath = this.dataset.path;

            // 선택 상태 업데이트
            document.querySelectorAll('.folder-row').forEach(r => r.classList.remove('selected'));
            this.classList.add('selected');

            // 노드 폴더 경로 업데이트
            if (state.selectedNode) {
                state.selectedNode.folder = selectedPath;
            }
            if (state.tempNodeData) {
                state.tempNodeData.folder = selectedPath;
            }

            // 전역 선택 폴더 업데이트
            state.selectedFolder = selectedPath;
        });

        // 드래그 시작
        row.addEventListener('dragstart', function(e) {
            if (this.dataset.path === '/') {
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData('text/plain', this.dataset.path);
            this.classList.add('dragging');
        });

        // 드래그 끝
        row.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            document.querySelectorAll('.folder-row').forEach(r => r.classList.remove('drag-over'));
        });

        // 드래그 오버
        row.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingPath = document.querySelector('.folder-row.dragging')?.dataset.path;
            if (draggingPath && draggingPath !== this.dataset.path) {
                this.classList.add('drag-over');
            }
        });

        // 드래그 리브
        row.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        // 드롭 - 하위 폴더로 이동
        row.addEventListener('drop', async function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');

            const draggedPath = e.dataTransfer.getData('text/plain');
            const targetPath = this.dataset.path;

            if (!draggedPath || draggedPath === targetPath) return;

            // 자신의 하위 폴더로 이동하는 것 방지
            if (targetPath.startsWith(draggedPath + '/')) {
                alert('폴더를 자신의 하위 폴더로 이동할 수 없습니다.');
                return;
            }

            // 폴더 이동 실행
            await moveFolderTo(draggedPath, targetPath);
        });
    });

    // + 버튼 클릭으로 하위 폴더 추가
    document.querySelectorAll('.folder-add-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const parentPath = this.dataset.parent;
            showInlineFolderInput(this, parentPath);
        });
    });
}

// 인라인 폴더 입력 표시
function showInlineFolderInput(button, parentPath) {
    // 기존 입력 제거
    const existingInput = document.querySelector('.inline-folder-input');
    if (existingInput) existingInput.remove();

    const inputContainer = document.createElement('div');
    inputContainer.className = 'inline-folder-input';
    inputContainer.innerHTML = `
        <input type="text" placeholder="폴더 이름" maxlength="20">
        <button class="confirm-btn">✓</button>
        <button class="cancel-btn">✕</button>
    `;

    // 버튼 옆에 삽입
    button.parentElement.appendChild(inputContainer);

    const input = inputContainer.querySelector('input');
    input.focus();

    // 확인 버튼
    inputContainer.querySelector('.confirm-btn').addEventListener('click', async () => {
        const name = input.value.trim();
        if (name) {
            await createSubFolder(parentPath, name);
        }
        inputContainer.remove();
    });

    // 취소 버튼
    inputContainer.querySelector('.cancel-btn').addEventListener('click', () => {
        inputContainer.remove();
    });

    // Enter 키
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const name = input.value.trim();
            if (name) {
                await createSubFolder(parentPath, name);
            }
            inputContainer.remove();
        } else if (e.key === 'Escape') {
            inputContainer.remove();
        }
    });
}

// 하위 폴더 생성
async function createSubFolder(parentPath, folderName) {
    const newPath = parentPath === '/' ? '/' + folderName : parentPath + '/' + folderName;

    // 폴더 노드 생성
    const folderNode = {
        id: Date.now(),
        title: folderName,
        content: '',
        isFolder: true,
        folderPath: newPath,
        folder: parentPath,
        x: 0,
        y: 0,
        date: new Date().toISOString().split('T')[0]
    };

    // 노드 배열에 추가
    const nodesToUse = window.nodes || [];
    nodesToUse.push(folderNode);

    // Firebase 저장
    if (typeof FirebaseManager !== 'undefined' && FirebaseManager.saveNode) {
        try {
            await FirebaseManager.saveNode(folderNode);
        } catch (error) {
            console.error('폴더 저장 실패:', error);
        }
    }

    // UI 업데이트
    updateFolderPathButtons(state.selectedFolder || '/');

    if (typeof render === 'function') {
        render();
    }
}

// 폴더 이동
async function moveFolderTo(sourcePath, targetPath) {
    const nodesToUse = window.nodes || [];
    const newPath = targetPath === '/'
        ? '/' + sourcePath.split('/').pop()
        : targetPath + '/' + sourcePath.split('/').pop();

    // 이동할 폴더 노드 찾기
    const folderNode = nodesToUse.find(n => n.isFolder && n.folderPath === sourcePath);
    if (!folderNode) return;

    // 폴더 경로 업데이트
    const oldPath = folderNode.folderPath;
    folderNode.folderPath = newPath;
    folderNode.folder = targetPath;

    // 하위 폴더들도 경로 업데이트
    nodesToUse.forEach(node => {
        if (node.isFolder && node.folderPath && node.folderPath.startsWith(oldPath + '/')) {
            node.folderPath = node.folderPath.replace(oldPath, newPath);
        }
        // 해당 폴더의 노드들도 업데이트
        if (node.folder && node.folder.startsWith(oldPath)) {
            node.folder = node.folder.replace(oldPath, newPath);
        }
    });

    // Firebase 저장
    if (typeof FirebaseManager !== 'undefined' && FirebaseManager.saveNode) {
        try {
            for (const node of nodesToUse.filter(n => n.folder?.startsWith(newPath) || n.folderPath?.startsWith(newPath))) {
                await FirebaseManager.saveNode(node);
            }
        } catch (error) {
            console.error('폴더 이동 저장 실패:', error);
        }
    }

    // UI 업데이트
    updateFolderPathButtons(state.selectedFolder || '/');

    if (typeof render === 'function') {
        render();
    }
}

// 폴더 이름 입력 필드 표시 함수 (레거시 지원)
function showNewFolderInput() {
    const container = document.getElementById('newFolderInputContainer');
    if (container) {
        container.style.display = 'block';
        document.getElementById('newFolderInput').focus();
    }
}

// 폴더 이름 입력 필드 숨김 함수 (레거시 지원)
function hideNewFolderInput() {
    const container = document.getElementById('newFolderInputContainer');
    if (container) {
        container.style.display = 'none';
        document.getElementById('newFolderInput').value = '';
    }
}
