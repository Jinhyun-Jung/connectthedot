// 폴더 노드에서 하위 노드 생성 함수
async function createNodeNearFolderNode(folderNode) {
    console.log('폴더에서 새 노드 생성:', folderNode);

    // 폴더 노드 근처에 새 노드 생성
    const offsetX = Math.random() * 200 - 100; // -100 ~ 100 랜덤
    const offsetY = Math.random() * 200 - 100; // -100 ~ 100 랜덤
    
    const newX = folderNode.x + offsetX;
    const newY = folderNode.y + offsetY;

    // 새 노드 생성
    const newNode = await NodeManager.createNew(newX, newY);
    if (newNode) {
        // 새 노드를 폴더의 하위로 설정
        newNode.folder = folderNode.folderPath || folderNode.folder || '/';

        // createNew() may have saved the node before the folder was assigned.
        if (window.FirebaseManager?.saveNode) {
            await window.FirebaseManager.saveNode(newNode);
        }
        
        // 에디터 열기
        openEditor(newNode);
    }
}

function normalizeEditorFolderPath(path) {
    if (!path || path === '/') return '/';
    return `/${String(path).split('/').filter(Boolean).join('/')}`;
}

// 노드 편집 관련 함수
function openEditor(node) {
    if (!node) return;

    console.log('Opening editor for node:', node);

    // 폴더 노드인 경우 이름만 수정하도록 다이얼로그 표시
    if (node.isFolder) {
        showFolderRenameDialog(node, window.innerWidth / 2, window.innerHeight / 2);
        return;
    }

    const editor = document.getElementById('editor');

    // 스프레드시트 노드인 경우
    if (node.isSpreadsheet) {
        console.log('Opening spreadsheet editor');
        openSpreadsheetEditor(node);
        return;
    }

    // 일반 노드 에디터 처리
    const titleInput = document.getElementById('titleInput');
    titleInput.value = node.title || '';
    titleInput.style.color = '#000000';

    document.getElementById('dateInput').value = node.date || new Date().toISOString().split('T')[0];
    document.getElementById('contentInput').value = node.content || '';
    
    // 스타일 정보 적용
    const contentInput = document.getElementById('contentInput');
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');
    const textColorBtn = document.getElementById('textColorBtn');
    const bgColorBtn = document.getElementById('bgColorBtn');
    const textColorIndicator = document.getElementById('textColorIndicator');
    const bgColorIndicator = document.getElementById('bgColorIndicator');
    
    // 모든 버튼 활성화 상태 초기화
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    contentInput.style = ''; // 기존 스타일 초기화
    
    // 폰트 패밀리 설정
    if (node.fontFamily) {
        fontFamilySelect.value = node.fontFamily;
        contentInput.style.fontFamily = node.fontFamily;
        contentInput.style.setProperty('font-family', node.fontFamily, 'important');
        
        // 기존 폰트 클래스 제거
        contentInput.classList.remove('font-noto-sans', 'font-noto-serif', 'font-gulim', 'font-batang');
        
        // 선택된 폰트에 따라 클래스 추가
        if (node.fontFamily.includes('Noto Sans')) {
            contentInput.classList.add('font-noto-sans');
        } else if (node.fontFamily.includes('Noto Serif')) {
            contentInput.classList.add('font-noto-serif');
        } else if (node.fontFamily.includes('Gulim')) {
            contentInput.classList.add('font-gulim');
        } else if (node.fontFamily.includes('Batang')) {
            contentInput.classList.add('font-batang');
        }
        
        console.log('에디터 오픈 시 폰트 적용:', node.fontFamily);
    } else {
        // 기본 폰트 적용
        const defaultFont = "'Noto Sans KR', sans-serif";
        fontFamilySelect.value = defaultFont;
        contentInput.style.fontFamily = defaultFont;
        contentInput.style.setProperty('font-family', defaultFont, 'important');
        contentInput.classList.add('font-noto-sans');
    }
    
    // 폰트 사이즈 설정
    if (node.fontSize) {
        // 'pt' 단위 제거하고 숫자만 추출
        const sizeValue = parseInt(node.fontSize);
        fontSizeInput.value = sizeValue || 12;
        contentInput.style.fontSize = node.fontSize;
        contentInput.style.setProperty('font-size', node.fontSize, 'important');
    } else {
        fontSizeInput.value = 12;
        contentInput.style.fontSize = '12pt';
        contentInput.style.setProperty('font-size', '12pt', 'important');
    }
    
    // 글자 굵기 설정
    if (node.fontWeight === 'bold') {
        contentInput.style.fontWeight = 'bold';
        contentInput.style.setProperty('font-weight', 'bold', 'important');
        const boldButton = document.querySelector('.format-btn[data-format="bold"]');
        if (boldButton) boldButton.classList.add('active');
    } else {
        contentInput.style.fontWeight = 'normal';
        contentInput.style.setProperty('font-weight', 'normal', 'important');
    }
    
    // 글자 기울임 설정
    if (node.fontStyle === 'italic') {
        contentInput.style.fontStyle = 'italic';
        contentInput.style.setProperty('font-style', 'italic', 'important');
        const italicButton = document.querySelector('.format-btn[data-format="italic"]');
        if (italicButton) italicButton.classList.add('active');
    } else {
        contentInput.style.fontStyle = 'normal';
        contentInput.style.setProperty('font-style', 'normal', 'important');
    }
    
    // 글자 색상 설정
    if (node.textColor) {
        contentInput.style.color = node.textColor;
        contentInput.style.setProperty('color', node.textColor, 'important');

        // 인디케이터 업데이트
        if (textColorIndicator) {
            textColorIndicator.style.backgroundColor = node.textColor;
        }
        // 'A' 글자에 선택한 색 적용
        if (textColorBtn) {
            textColorBtn.style.color = node.textColor;
        }
    } else {
        contentInput.style.color = '#000000';
        contentInput.style.setProperty('color', '#000000', 'important');

        // 인디케이터 업데이트
        if (textColorIndicator) {
            textColorIndicator.style.backgroundColor = '#000000';
        }
        if (textColorBtn) {
            textColorBtn.style.color = '#000000';
        }
    }
    
    // 배경 색상 설정 (important 속성 사용)
    if (node.bgColor) {
        // 직접 스타일 속성 설정
        contentInput.style.backgroundColor = node.bgColor;
        contentInput.style.setProperty('background-color', node.bgColor, 'important');
        
        // 추가적인 확실한 적용을 위해 인라인 스타일 강제 설정
        const currentStyle = contentInput.getAttribute('style') || '';
        const newStyle = currentStyle.replace(/background-color:[^;]+;?/gi, '') + 
                        `background-color: ${node.bgColor} !important;`;
        contentInput.setAttribute('style', newStyle);
        
        // 인디케이터 업데이트
        if (bgColorIndicator) {
            bgColorIndicator.style.backgroundColor = node.bgColor;
            bgColorIndicator.style.border = node.bgColor.toLowerCase() === '#ffffff' ? '1px solid #ccc' : 'none';
        }
        
        console.log('배경색 적용:', node.bgColor);
    } else {
        contentInput.style.backgroundColor = '#FFFFFF';
        contentInput.style.setProperty('background-color', '#FFFFFF', 'important');
        
        // 인디케이터 업데이트
        if (bgColorIndicator) {
            bgColorIndicator.style.backgroundColor = '#FFFFFF';
            bgColorIndicator.style.border = '1px solid #ccc';
        }
    }
    
    // 텍스트 정렬 설정
    if (node.textAlign) {
        contentInput.style.textAlign = node.textAlign;
        contentInput.style.setProperty('text-align', node.textAlign, 'important');
        
        // 해당 정렬 버튼 활성화
        const alignButtons = document.querySelectorAll('.align-btn');
        alignButtons.forEach(btn => {
            if (btn.dataset.align === node.textAlign) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        contentInput.style.textAlign = 'left';
        contentInput.style.setProperty('text-align', 'left', 'important');
        
        // 기본 왼쪽 정렬 버튼 활성화
        const leftAlignBtn = document.querySelector('.align-btn[data-align="left"]');
        if (leftAlignBtn) leftAlignBtn.classList.add('active');
    }
    
    // 에디터 표시 설정
    editor.style.display = 'block';
    
    // 에디터 위치 조정 - 화면 중앙보다 약간 아래로
    const windowHeight = window.innerHeight;
    const editorHeight = Math.min(editor.offsetHeight, windowHeight * 0.8); // 최대 높이 제한
    const topPosition = Math.max(20, (windowHeight - editorHeight) / 2);
    
    editor.style.top = '50%';
    editor.style.transform = 'translate(-50%, -50%)';
    editor.style.maxHeight = '80vh';
    editor.style.overflowY = 'auto';

    state.selectedNode = node;
    const editorFolderPath = normalizeEditorFolderPath(node.folder || '/');
    state.selectedFolder = editorFolderPath;

    // 현재 폴더 경로 업데이트 및 버튼 선택 상태 초기화
    updateFolderPathButtons(editorFolderPath);

    // 폴더 행 클릭 상태 업데이트 (.folder-row 사용)
    document.querySelectorAll('.folder-row').forEach(row => {
        row.classList.toggle('selected', row.dataset.path === editorFolderPath);
    });

    // 색상 버튼 상태 초기화
    const colorButtons = document.querySelectorAll('.emotion-color-btn');
    colorButtons.forEach(btn => {
        btn.classList.toggle('active', node.emotion === btn.dataset.color);
    });
}

// 색상 밝기 계산 함수 - openEditor에서 사용하기 위해 외부로 이동
function getBrightness(hexColor) {
    // '#RRGGBB' 형식에서 RGB 값 추출
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // 밝기 계산 (인지적 휘도 공식)
    return (r * 299 + g * 587 + b * 114) / 1000;
}

// saveNode 함수
async function saveNode() {
    // 새 노드 생성인 경우
    if (!state.selectedNode && state.tempNodeData) {
        // 입력값 가져오기
        const newTitle = document.getElementById('titleInput').value.trim();
        const newDate = document.getElementById('dateInput').value || null;
        const newContent = document.getElementById('contentInput').value.trim();
        const contentInput = document.getElementById('contentInput');

        // 제목이 필수입니다
        if (!newTitle) {
            alert('제목을 입력해주세요.');
            document.getElementById('titleInput').focus();
            return;
        }

        // 제목이나 내용이 없으면 저장하지 않고 닫기
        if (!newTitle && !newContent) {
            closeEditor();
            return;
        }

        // 선택된 색상 가져오기
        const activeColorBtn = document.querySelector('.emotion-color-btn.active');
        const selectedColor = activeColorBtn ? activeColorBtn.dataset.color : '#FFFFFF';

        // 스타일 정보 가져오기
        const fontFamily = document.getElementById('fontFamily').value;
        const fontSize = document.getElementById('fontSize').value + 'pt';
        const fontWeight = contentInput.style.fontWeight || 'normal';
        const fontStyle = contentInput.style.fontStyle || 'normal';
        const textColor = contentInput.style.color || '#000000';
        const bgColor = contentInput.style.backgroundColor || '#ffffff';
        const textAlign = contentInput.style.textAlign || 'left';

        // 현재 선택된 폴더 경로 가져오기 (.folder-row.selected 사용)
        const selectedFolderRow = document.querySelector('#editor .folder-row.selected') ||
                                   document.querySelector('.folder-buttons .folder-row.selected');
        const folderPath = normalizeEditorFolderPath(
            selectedFolderRow?.dataset.path || state.tempNodeData.folder || state.selectedFolder || '/'
        );
        state.tempNodeData.folder = folderPath;
        state.selectedFolder = folderPath;

        // 새 노드 생성
        const now = new Date();
        const nodeId = Date.now();
        
        const newNode = {
            id: nodeId,
            title: newTitle,
            content: newContent,
            x: state.tempNodeData.x,
            y: state.tempNodeData.y,
            baseX: state.tempNodeData.baseX,
            baseY: state.tempNodeData.baseY,
            phase: Math.random() * Math.PI * 2,
            folder: folderPath,
            emotion: selectedColor,
            titleColor: selectedColor,
            date: newDate || new Date().toISOString().split('T')[0],
            vx: 0,
            vy: 0,
            mass: 1,
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            textColor: textColor,
            bgColor: bgColor,
            textAlign: textAlign,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        try {
            console.log('새 노드 생성 및 저장:', newNode);
            
            // Firebase에 저장
            await FirebaseManager.saveNode(newNode);
            
            // 로컬 배열에 추가
            const existingIds = new Set(nodes.map(node => node.id.toString()));
            if (!existingIds.has(newNode.id.toString())) {
                nodes.push(newNode);
                console.log('새 노드 로컬 배열에 추가 완료:', nodeId);
            }
            
            // UI 업데이트
            updateLinks();
            render();
            renderFolderTree();
            closeEditor();
            
            // 임시 데이터 정리
            state.tempNodeData = null;
            
            console.log('새 노드가 성공적으로 생성되었습니다.');
            NodeManager.showErrorNotification('노드가 성공적으로 생성되었습니다.', 'success');
            
        } catch (error) {
            console.error('새 노드 생성 중 오류 발생:', error);
            NodeManager.showErrorNotification('노드 생성 중 오류가 발생했습니다.', 'error');
        }
        return;
    }
    
    // 기존 노드 수정인 경우
    if (state.selectedNode) {
        // 저장 전 현재 상태 히스토리에 추가
        HistoryManager.pushState();

        state.selectedNode.isEdited = true;
        state.selectedNode.isTemporary = false;

        // 입력값 가져오기
        const newTitle = document.getElementById('titleInput').value.trim();
        const newDate = document.getElementById('dateInput').value || null;
        const newContent = document.getElementById('contentInput').value.trim();
        const contentInput = document.getElementById('contentInput');

        // 제목이 필수입니다
        if (!newTitle) {
            alert('제목을 입력해주세요.');
            document.getElementById('titleInput').focus();
            return;
        }

        // 선택된 색상 가져오기
        const activeColorBtn = document.querySelector('.emotion-color-btn.active');
        const selectedColor = activeColorBtn ? activeColorBtn.dataset.color : '#FFFFFF';

        // 스타일 정보 가져오기
        const fontFamily = document.getElementById('fontFamily').value;
        const fontSize = document.getElementById('fontSize').value + 'pt';
        const fontWeight = contentInput.style.fontWeight || 'normal';
        const fontStyle = contentInput.style.fontStyle || 'normal';
        const textColor = contentInput.style.color || '#000000';
        const bgColor = contentInput.style.backgroundColor || '#ffffff';
        const textAlign = contentInput.style.textAlign || 'left';

        // 값 업데이트
        state.selectedNode.title = newTitle;
        state.selectedNode.content = newContent;
        state.selectedNode.emotion = selectedColor;
        state.selectedNode.titleColor = selectedColor;
        state.selectedNode.fontFamily = fontFamily;
        state.selectedNode.fontSize = fontSize;
        state.selectedNode.fontWeight = fontWeight;
        state.selectedNode.fontStyle = fontStyle;
        state.selectedNode.textColor = textColor;
        state.selectedNode.bgColor = bgColor;
        state.selectedNode.textAlign = textAlign;

        // 현재 선택된 폴더 경로 가져오기 (.folder-row.selected 사용)
        const selectedFolderRow = document.querySelector('#editor .folder-row.selected') ||
                                   document.querySelector('.folder-buttons .folder-row.selected');
        const folderPath = normalizeEditorFolderPath(
            selectedFolderRow?.dataset.path || state.selectedNode.folder || state.selectedFolder || '/'
        );
        state.selectedFolder = folderPath;

        console.log('폴더 경로 저장:', {
            selectedFolderRow: selectedFolderRow,
            folderPath: folderPath,
            previousFolder: state.selectedNode.folder
        });

        state.selectedNode.folder = folderPath;

        // 날짜 처리 - 폴더 노드가 아닌 경우에만 날짜 설정
        if (state.selectedNode.isFolder) {
            // 폴더 노드는 날짜 없음
            state.selectedNode.date = null;
        } else {
            // 일반 노드는 날짜 설정 (입력값이 없으면 오늘 날짜)
            state.selectedNode.date = newDate || new Date().toISOString().split('T')[0];
        }
        
        console.log('노드 날짜 저장:', {
            nodeId: state.selectedNode.id,
            nodeTitle: state.selectedNode.title,
            isFolder: state.selectedNode.isFolder,
            inputDate: newDate,
            finalDate: state.selectedNode.date,
            dateType: typeof state.selectedNode.date
        });
        
        state.selectedNode.updatedAt = new Date().toISOString();

        try {
            await FirebaseManager.saveNode(state.selectedNode);
            updateLinks();
            render();
            renderFolderTree();
            closeEditor();
            console.log('노드가 성공적으로 수정되었습니다.');
            NodeManager.showErrorNotification('노드가 성공적으로 수정되었습니다.', 'success');
        } catch (error) {
            console.error('노드 수정 중 오류 발생:', error);
            NodeManager.showErrorNotification('노드 수정 중 오류가 발생했습니다.', 'error');
        }
    }
}

// closeEditor 함수
function closeEditor() {
    const editor = document.getElementById('editor');
    editor.dispatchEvent(new Event('hide'));
    editor.style.display = 'none';
    document.querySelectorAll('.node.editing').forEach(node => {
        node.classList.remove('editing');
    });
    state.selectedNode = null;
    state.tempNodeData = null; // 임시 데이터도 정리
}

// 새 노드를 위한 에디터 열기 함수
function openEditorForNewNode(tempNodeData) {
    console.log('새 노드를 위한 에디터 열기:', tempNodeData);

    const editor = document.getElementById('editor');
    
    // 일반 노드 에디터 처리
    const titleInput = document.getElementById('titleInput');
    titleInput.value = '';
    titleInput.style.color = '#000000';

    document.getElementById('dateInput').value = tempNodeData.date;
    document.getElementById('contentInput').value = '';
    
    // 스타일 정보 초기화
    const contentInput = document.getElementById('contentInput');
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');
    const textColorIndicator = document.getElementById('textColorIndicator');
    const bgColorIndicator = document.getElementById('bgColorIndicator');
    
    // 모든 버튼 활성화 상태 초기화
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    contentInput.style = ''; // 기존 스타일 초기화
    
    // 기본 폰트 설정
    const defaultFont = "'Noto Sans KR', sans-serif";
    fontFamilySelect.value = defaultFont;
    contentInput.style.fontFamily = defaultFont;
    contentInput.style.setProperty('font-family', defaultFont, 'important');
    contentInput.classList.add('font-noto-sans');
    
    // 기본 폰트 사이즈 설정
    fontSizeInput.value = 12;
    contentInput.style.fontSize = '12pt';
    contentInput.style.setProperty('font-size', '12pt', 'important');
    
    // 기본 텍스트 색상 설정
    contentInput.style.color = '#000000';
    contentInput.style.setProperty('color', '#000000', 'important');
    if (textColorIndicator) {
        textColorIndicator.style.backgroundColor = '#000000';
    }
    const textColorBtnReset = document.getElementById('textColorBtn');
    if (textColorBtnReset) {
        textColorBtnReset.style.color = '#000000';
    }

    // 기본 배경 색상 설정
    contentInput.style.backgroundColor = '#FFFFFF';
    contentInput.style.setProperty('background-color', '#FFFFFF', 'important');
    if (bgColorIndicator) {
        bgColorIndicator.style.backgroundColor = '#FFFFFF';
        bgColorIndicator.style.border = '1px solid #ccc';
    }
    
    // 기본 텍스트 정렬 설정
    contentInput.style.textAlign = 'left';
    contentInput.style.setProperty('text-align', 'left', 'important');
    const leftAlignBtn = document.querySelector('.align-btn[data-align="left"]');
    if (leftAlignBtn) leftAlignBtn.classList.add('active');
    
    // 에디터 표시 설정
    editor.style.display = 'block';
    
    // 에디터 위치 조정
    editor.style.top = '50%';
    editor.style.transform = 'translate(-50%, -50%)';
    editor.style.maxHeight = '80vh';
    editor.style.overflowY = 'auto';

    // 임시 노드 데이터를 state에 저장
    tempNodeData.folder = normalizeEditorFolderPath(tempNodeData.folder || '/');
    state.tempNodeData = tempNodeData;
    state.selectedNode = null; // 기존 노드가 아닌 새 노드임을 표시
    state.selectedFolder = tempNodeData.folder;

    // 현재 폴더 경로 업데이트 및 버튼 선택 상태 초기화
    updateFolderPathButtons(tempNodeData.folder);

    // 폴더 행 클릭 상태 업데이트 (.folder-row 사용)
    document.querySelectorAll('.folder-row').forEach(row => {
        row.classList.toggle('selected', row.dataset.path === tempNodeData.folder);
    });

    // 색상 버튼 상태 초기화
    const colorButtons = document.querySelectorAll('.emotion-color-btn');
    colorButtons.forEach(btn => {
        btn.classList.remove('active');
    });
} 
