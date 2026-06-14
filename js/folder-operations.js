// 공통 폴더 노드 생성 함수
async function createFolderNode(folderName, currentFolder) {
    const newPath = currentFolder === '/' ? `/${folderName}` : `${currentFolder}/${folderName}`;

    // 폴더 경로 중복 체크
    const existingFolders = folderStructure.getAllPaths();
    if (existingFolders.includes(newPath)) {
        throw new Error('이미 존재하는 폴더 이름입니다.');
    }

    // 상위 폴더의 노드들 위치 평균 계산
    const nodesToUse = window.nodes || nodes || [];
    const parentNodes = nodesToUse.filter(node => node.folder === currentFolder);
    let newX = window.innerWidth / 2;
    let newY = window.innerHeight / 2;

    if (parentNodes.length > 0) {
        newX = parentNodes.reduce((sum, node) => sum + node.x, 0) / parentNodes.length;
        newY = parentNodes.reduce((sum, node) => sum + node.y, 0) / parentNodes.length;
        newX += Math.random() * 100 - 50;
        newY += Math.random() * 100 - 50;
    }

    // 폴더 노드 생성
    const folderNode = {
        id: Date.now() + Math.floor(Math.random() * 1000), // 정수로 생성하여 안전하게 처리
        title: folderName,
        content: '',
        folder: currentFolder,
        date: new Date().toISOString().split('T')[0],
        x: newX,
        y: newY,
        isFolder: true,
        folderPath: newPath,
        baseX: newX,
        baseY: newY,
        vx: 0,
        vy: 0,
        mass: 1.5,
        phase: Math.random() * Math.PI * 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emotion: 'default',
        style: {
            backgroundColor: '#000000',
            borderColor: '#ddd'
        }
    };

    console.log('폴더 노드 생성 중:', {
        id: folderNode.id,
        idType: typeof folderNode.id,
        isValidId: !isNaN(folderNode.id) && folderNode.id > 0,
        title: folderNode.title
    });

    // Firebase에 저장
    await FirebaseManager.saveNode(folderNode);
    
    // window.nodes와 로컬 nodes 배열 모두에 추가
    if (window.nodes) {
        const existingIndex = window.nodes.findIndex(n => n.id === folderNode.id);
        if (existingIndex === -1) {
            window.nodes.push(folderNode);
        }
    } else {
        window.nodes = [folderNode];
    }
    
    if (typeof nodes !== 'undefined' && Array.isArray(nodes)) {
        const existingIndex = nodes.findIndex(n => n.id === folderNode.id);
        if (existingIndex === -1) {
            nodes.push(folderNode);
        }
    }
    
    console.log('폴더 노드 생성됨:', {
        folderNode: folderNode,
        windowNodesCount: window.nodes?.length,
        localNodesCount: nodes?.length
    });
    
    // UI 업데이트
    updateLinks();
    renderFolderTree();
    render();
    
    return folderNode;
}

// 새 폴더 생성 함수 (단순화됨)
async function createNewFolder() {
    const folderName = prompt('새 폴더 이름을 입력하세요:');
    if (!folderName) return;

    const currentFolder = state.selectedFolder || '/';

    try {
        await createFolderNode(folderName, currentFolder);
    } catch (error) {
        console.error('폴더 생성 중 오류:', error);
        alert(error.message);
    }
}

// 에디터에서 폴더 생성하는 함수 (단순화됨)
async function createFolderFromEditor() {
    const folderName = document.getElementById('newFolderInput').value.trim();
    if (!folderName) {
        alert('폴더 이름을 입력해주세요.');
        return;
    }

    const currentFolder = state.selectedFolder || '/';

    try {
        await createFolderNode(folderName, currentFolder);
        
        // 에디터 특정 UI 정리
        document.getElementById('newFolderInput').value = '';
        hideNewFolderInput();
        updateFolderPathButtons(currentFolder);
    } catch (error) {
        console.error('폴더 생성 중 오류:', error);
        alert(error.message);
    }
}

// 새 노드 생성 함수
async function createNewNode() {
    const currentFolder = state.selectedFolder || '/';

    // 현재 폴더의 노드들 찾기
    const nodesToUse = window.nodes || nodes || [];
    const folderNodes = nodesToUse.filter(node => node.folder === currentFolder);

    // 새 노드의 위치 계산
    let newX, newY;

    if (folderNodes.length > 0) {
        const avgX = folderNodes.reduce((sum, node) => sum + node.x, 0) / folderNodes.length;
        const avgY = folderNodes.reduce((sum, node) => sum + node.y, 0) / folderNodes.length;
        const angle = (Math.PI * 2 * folderNodes.length) / (folderNodes.length + 1);
        const radius = 150;
        newX = avgX + radius * Math.cos(angle);
        newY = avgY + radius * Math.sin(angle);
    } else {
        newX = window.innerWidth / 2;
        newY = window.innerHeight / 2;
    }

    const newNode = {
        id: Date.now(),
        title: '새 노드',
        content: '',
        folder: currentFolder,
        date: new Date().toISOString().split('T')[0],
        x: newX,
        y: newY,
        baseX: newX,
        baseY: newY,
        vx: 0,
        vy: 0,
        mass: 1,
        phase: Math.random() * Math.PI * 2
    };

    try {
        // Firebase에 저장하고 로컬 배열에 추가
        await FirebaseManager.saveNode(newNode);

        // window.nodes와 nodes 배열 모두에 추가
        if (window.nodes) {
            window.nodes.push(newNode);
        }
        if (typeof nodes !== 'undefined' && Array.isArray(nodes)) {
            const existingIndex = nodes.findIndex(n => n.id === newNode.id);
            if (existingIndex === -1) {
                nodes.push(newNode);
            }
        }

        // UI 업데이트
        render();
        renderFolderTree();

        // 에디터 열기 (약간의 지연을 주어 렌더링이 완료된 후 실행)
        setTimeout(() => {
            openEditor(newNode);
        }, 100);
    } catch (error) {
        console.error('노드 생성 중 오류:', error);
        alert('노드 생성에 실패했습니다.');
    }
}

// 현재 폴더에 새 노드 생성 (폴더뷰에서 호출)
async function createNodeInCurrentFolder() {
    await createNewNode();
} 