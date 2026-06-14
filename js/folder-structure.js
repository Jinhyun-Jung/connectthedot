// 폴더 구조 관리 객체
const folderStructure = {
    buildFromNodes: function () {
        const structure = {};
        // window.nodes를 우선적으로 사용
        const nodesToUse = window.nodes || nodes || [];

        // 먼저 모든 폴더 노드를 처리
        nodesToUse.filter(node => node && node.isFolder).forEach(node => {
            if (!node.folderPath) return;
            const parts = node.folderPath.split('/').filter(p => p);
            let current = structure;
            parts.forEach(part => {
                current[part] = current[part] || {};
                current = current[part];
            });
        });

        // 일반 노드의 폴더 구조도 추가
        nodesToUse.forEach(node => {
            if (!node || !node.folder) return;
            const parts = node.folder.split('/').filter(p => p);
            let current = structure;
            parts.forEach(part => {
                current[part] = current[part] || {};
                current = current[part];
            });
        });

        return structure;
    },

    // 폴더 구조가 변경될 때 폴더 노드 생성
    ensureFolderNodes: async function () {
        const structure = this.buildFromNodes();
        // window.nodes를 우선적으로 사용
        const nodesToUse = window.nodes || nodes || [];
        const existingFolderPaths = new Set(
            nodesToUse.filter(n => n && n.isFolder).map(n => n.folderPath)
        );

        const newFolderNodes = [];

        async function traverseStructure(obj, currentPath = '') {
            for (let key in obj) {
                const fullPath = currentPath + '/' + key;
                // 이미 존재하는 폴더 경로인지 더 엄격하게 체크
                const folderExists = nodesToUse.some(n => 
                    n && n.isFolder && 
                    (n.folderPath === fullPath || n.folder === fullPath)
                );

                if (!folderExists && !existingFolderPaths.has(fullPath)) {
                    const parentPath = currentPath || '/';
                    const parentNodes = nodesToUse.filter(n => n && n.folder === parentPath);

                    let newX = window.innerWidth / 2;
                    let newY = window.innerHeight / 2;
                    if (parentNodes.length > 0) {
                        newX = parentNodes.reduce((sum, n) => sum + n.x, 0) / parentNodes.length;
                        newY = parentNodes.reduce((sum, n) => sum + n.y, 0) / parentNodes.length;
                        newX += Math.random() * 100 - 50;
                        newY += Math.random() * 100 - 50;
                    }

                    const folderNode = {
                        id: Date.now() + Math.floor(Math.random() * 10000), // 정수로 생성하여 안전하게 처리
                        title: key,
                        content: '',
                        folder: parentPath,
                        date: new Date().toISOString().split('T')[0],
                        x: newX,
                        y: newY,
                        isFolder: true,
                        folderPath: fullPath,
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

                    newFolderNodes.push(folderNode);
                    existingFolderPaths.add(fullPath);
                }
                await traverseStructure(obj[key], fullPath);
            }
        }

        await traverseStructure(structure);

        // 새로 생성된 폴더 노드들을 한 번에 저장
        for (const folderNode of newFolderNodes) {
            console.log('자동 폴더 노드 생성:', folderNode);
            
            await FirebaseManager.saveNode(folderNode);
            
            // window.nodes와 로컬 nodes 배열 모두에 추가 (중복 방지)
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
        }

        if (newFolderNodes.length > 0) {
            console.log('자동 생성된 폴더 노드 수:', newFolderNodes.length);
            updateLinks();
            render();
        }
    },

    getAllPaths: function () {
        const paths = new Set();
        // window.nodes를 우선적으로 사용
        const nodesToUse = window.nodes || nodes || [];
        
        nodesToUse.forEach(node => {
            if (!node) return;
            
            if (node.folder) {
                // 폴더 경로 추가
                paths.add(node.folder);
            }
            if (node.isFolder && node.folderPath) {
                // 폴더 노드의 경로 추가
                paths.add(node.folderPath);
            }
        });
        return Array.from(paths);
    }
}; 