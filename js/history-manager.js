// 히스토리 관리 객체
const HistoryManager = {
    // 상태 저장
    pushState: function () {
        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            links: JSON.parse(JSON.stringify(links))
        };

        state.history.undoStack.push(currentState);
        state.history.redoStack = [];  // Redo 스택 초기화

        // 최대 크기 제한
        if (state.history.undoStack.length > state.history.maxSize) {
            state.history.undoStack.shift();
        }
    },

    // 실행 취소
    undo: function () {
        if (state.history.undoStack.length === 0) return;

        // 현재 상태를 redo 스택에 저장
        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            links: JSON.parse(JSON.stringify(links))
        };
        state.history.redoStack.push(currentState);

        // 이전 상태 복원
        const previousState = state.history.undoStack.pop();
        nodes = previousState.nodes;
        links = previousState.links;

        // UI 업데이트
        updateLinks();
        render();
        renderFolderTree();
    },

    // 다시 실행
    redo: function () {
        if (state.history.redoStack.length === 0) return;

        // 현재 상태를 undo 스택에 저장
        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodes)),
            links: JSON.parse(JSON.stringify(links))
        };
        state.history.undoStack.push(currentState);

        // 다음 상태 복원
        const nextState = state.history.redoStack.pop();
        nodes = nextState.nodes;
        links = nextState.links;

        // UI 업데이트
        updateLinks();
        render();
        renderFolderTree();
    }
};

// 키보드 이벤트 리스너 추가
document.addEventListener('keydown', function (e) {
    // Ctrl + Z: 실행 취소
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        HistoryManager.undo();
    }
    // Ctrl + Shift + Z 또는 Ctrl + Y: 다시 실행
    else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        HistoryManager.redo();
    }
}); 