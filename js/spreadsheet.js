// 보안 강화된 스프레드시트 에디터 (2025 모던 JavaScript)

// 허용된 수식 함수들 (화이트리스트 방식)
const ALLOWED_FUNCTIONS = new Map([
    ['SUM', (values) => values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0)],
    ['AVG', (values) => values.length ? values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / values.length : 0],
    ['MAX', (values) => Math.max(...values.map(val => parseFloat(val) || 0))],
    ['MIN', (values) => Math.min(...values.map(val => parseFloat(val) || 0))],
    ['COUNT', (values) => values.filter(val => !isNaN(parseFloat(val))).length],
    ['ROUND', (value, digits = 0) => Math.round(parseFloat(value) * Math.pow(10, digits)) / Math.pow(10, digits)]
]);

// 허용된 연산자들
const ALLOWED_OPERATORS = ['+', '-', '*', '/', '(', ')', '.', ' '];

// 스프레드시트 상태 관리 (불변성 패턴)
class SpreadsheetState {
    constructor() {
        this.clipboard = [];
        this.selectedCells = new Set();
        this.isSelecting = false;
        this.startCell = null;
        this.lastSelectedCell = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
    }

    // 상태 저장 (실행 취소용)
    saveState(node) {
        this.historyIndex++;
        this.history = this.history.slice(0, this.historyIndex);
        this.history.push(JSON.parse(JSON.stringify(node.spreadsheetData)));
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    // 실행 취소
    undo(node) {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            node.spreadsheetData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            return true;
        }
        return false;
    }

    // 다시 실행
    redo(node) {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            node.spreadsheetData = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            return true;
        }
        return false;
    }
}

// 전역 스프레드시트 상태
const spreadsheetState = new SpreadsheetState();

// 스프레드시트 에디터 열기 함수 (모던 JavaScript 패턴)
function openSpreadsheetEditor(node) {
    const editor = document.getElementById('editor');
    if (!editor) {
        console.error('에디터 요소를 찾을 수 없습니다.');
        return;
    }

    // 스프레드시트 에디터용 스타일 적용
    Object.assign(editor.style, {
        width: '90%',
        maxWidth: '1400px',
        height: '85vh',
        maxHeight: '1000px',
        left: '50%',
        transform: 'translateX(-50%)',
        top: '7vh',
        padding: '20px'
    });

    // 데이터 안전성 검증
    const spreadsheetData = validateSpreadsheetData(node.spreadsheetData);
    const headers = Object.values(spreadsheetData.headers || {});
    const rows = Object.values(spreadsheetData.rows || {}).map(row => Object.values(row));

    // HTML 이스케이프 함수
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // 템플릿 리터럴로 안전한 HTML 생성
    editor.innerHTML = `
        <button type="button" class="spreadsheet-close-btn" onclick="closeEditor()" title="닫기">×</button>
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <input type="text" id="titleInput" placeholder="제목" value="${escapeHtml(node.title || '')}" 
                   style="font-size: 24px; color: #000000; width: 60%; background: white; border: 1px solid #ddd; padding: 8px;">
            <input type="date" id="dateInput" value="${node.date || new Date().toISOString().split('T')[0]}"
                   style="font-size: 16px; color: #000000; background: white; border: 1px solid #ddd; padding: 8px;">
        </div>
        
        <div class="spreadsheet-toolbar" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            <button type="button" class="spreadsheet-button" data-action="add-column" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">열 추가</button>
            <button type="button" class="spreadsheet-button" data-action="add-row" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">행 추가</button>
            <button type="button" class="spreadsheet-button" data-action="delete-selected" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">선택 삭제</button>
            <button type="button" class="spreadsheet-button" data-action="copy" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">복사</button>
            <button type="button" class="spreadsheet-button" data-action="paste" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">붙여넣기</button>
            <button type="button" class="spreadsheet-button" data-action="undo" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">실행 취소</button>
            <button type="button" class="spreadsheet-button" data-action="redo" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">다시 실행</button>
        </div>
        
        <div class="formula-bar" style="margin-bottom: 10px;">
            <label for="formulaInput" style="color: #000000; font-weight: bold;">수식: </label>
            <input type="text" id="formulaInput" style="width: 70%; padding: 5px; color: #000000; background: white; border: 1px solid #ddd;" placeholder="수식을 입력하세요 (예: =SUM(A1:A3))">
        </div>
        
        <div class="spreadsheet-container" style="height: calc(100% - 220px); overflow: auto; border: 1px solid #ddd; background: white;">
            <table class="spreadsheet-table" id="spreadsheetTable" style="border-collapse: collapse; width: 100%; color: #000000;">
                <thead>
                    <tr>
                        <th style="width: 40px; background: #f0f0f0; user-select: none; color: #000000; border: 1px solid #ddd; padding: 4px;"></th>
                        ${headers.map((header, i) =>
                            `<th contenteditable="true" style="min-width: 120px; position: relative; color: #000000; background: #f8f8f8; border: 1px solid #ddd; padding: 4px;">${getColumnLabel(i)}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, rowIndex) => `
                        <tr>
                            <th style="background: #f0f0f0; user-select: none; color: #000000; border: 1px solid #ddd; padding: 4px;">${rowIndex + 1}</th>
                            ${row.map((cell, colIndex) =>
                                `<td contenteditable="true" 
                                     data-row="${rowIndex}" 
                                     data-col="${colIndex}"
                                     data-cell="${getColumnLabel(colIndex)}${rowIndex + 1}"
                                     style="padding: 4px; border: 1px solid #ddd; color: #000000; background: white; min-height: 20px;"
                                >${escapeHtml(cell?.toString() || '')}</td>`
                            ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="editor-buttons" style="margin-top: 20px; text-align: right;">
            <button type="button" class="spreadsheet-button" data-action="save" style="color: #000000; background: #4CAF50; border: 1px solid #4CAF50; padding: 8px 16px; margin: 5px; border-radius: 4px; cursor: pointer; font-weight: bold;">저장</button>
        </div>
    `;

    // 이벤트 리스너 초기화
    initSpreadsheetEvents();
    
    // 히스토리 초기 상태 저장
    spreadsheetState.saveState(node);
    
    editor.style.display = 'block';
    if (typeof state !== 'undefined') {
    state.selectedNode = node;
}
}

// 스프레드시트 데이터 유효성 검증
function validateSpreadsheetData(data) {
    if (!data || typeof data !== 'object') {
        return {
            headers: { 0: 'A', 1: 'B', 2: 'C' },
            rows: {
                0: { 0: '', 1: '', 2: '' },
                1: { 0: '', 1: '', 2: '' },
                2: { 0: '', 1: '', 2: '' }
            }
        };
    }

    // 헤더와 행 데이터 검증
    const headers = data.headers || {};
    const rows = data.rows || {};

    // 숫자가 아닌 키 제거 (보안 강화)
    const validHeaders = {};
    const validRows = {};

    Object.keys(headers).forEach(key => {
        const numKey = parseInt(key, 10);
        if (!isNaN(numKey) && numKey >= 0) {
            validHeaders[numKey] = headers[key]?.toString() || '';
        }
    });

    Object.keys(rows).forEach(rowKey => {
        const numRowKey = parseInt(rowKey, 10);
        if (!isNaN(numRowKey) && numRowKey >= 0 && typeof rows[rowKey] === 'object') {
            validRows[numRowKey] = {};
            Object.keys(rows[rowKey]).forEach(colKey => {
                const numColKey = parseInt(colKey, 10);
                if (!isNaN(numColKey) && numColKey >= 0) {
                    validRows[numRowKey][numColKey] = rows[rowKey][colKey]?.toString() || '';
                }
            });
        }
    });

    return { headers: validHeaders, rows: validRows };
}

// 스프레드시트 이벤트 초기화 (모던 이벤트 위임 패턴)
function initSpreadsheetEvents() {
    const editor = document.getElementById('editor');
    const table = document.getElementById('spreadsheetTable');
    const formulaInput = document.getElementById('formulaInput');
    
    if (!editor || !table || !formulaInput) {
        console.error('필수 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    // 이벤트 위임을 사용한 툴바 이벤트 처리
    editor.addEventListener('click', handleToolbarActions);

    // 테이블 이벤트 처리
    table.addEventListener('mousedown', handleCellSelection);
    table.addEventListener('dblclick', handleCellEdit);
    table.addEventListener('keydown', handleKeyboardInput);
    table.addEventListener('input', handleCellInput);
    
    // 수식 입력 이벤트
    formulaInput.addEventListener('keydown', handleFormulaInput);
    formulaInput.addEventListener('input', updateSelectedCellsFromFormula);

    // 전역 키보드 단축키
    document.addEventListener('keydown', handleGlobalKeyboard);
}

// 툴바 액션 처리 (이벤트 위임)
function handleToolbarActions(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    
    switch (action) {
        case 'add-column':
            addSpreadsheetColumn();
            break;
        case 'add-row':
            addSpreadsheetRow();
            break;
        case 'delete-selected':
            deleteSelectedCells();
            break;
        case 'copy':
            copySelectedCells();
            break;
        case 'paste':
            pasteCells();
            break;
        case 'undo':
            undoAction();
            break;
        case 'redo':
            redoAction();
            break;
        case 'save':
            saveSpreadsheetNode();
            break;
        case 'close':
            if (typeof closeEditor === 'function') {
                closeEditor();
            }
            break;
    }
}

// 셀 선택 처리
function handleCellSelection(event) {
    const cell = event.target.closest('td[contenteditable]');
    if (!cell) return;

    event.preventDefault();
    
    if (!event.shiftKey) {
        clearSelection();
    }
    
    selectCell(cell);
    updateFormulaBar();
    
    spreadsheetState.isSelecting = true;
    spreadsheetState.startCell = cell;
}

// 셀 편집 처리
function handleCellEdit(event) {
    const cell = event.target.closest('td[contenteditable]');
        if (!cell) return;

        cell.focus();

        // 수식이 있는 경우 수식 표시
    const formula = cell.dataset.formula;
        if (formula) {
            cell.textContent = formula;
        }
}

// 키보드 입력 처리
function handleKeyboardInput(event) {
    const cell = event.target.closest('td[contenteditable]');
    if (!cell) return;

    switch (event.key) {
        case 'Enter':
            if (!event.shiftKey) {
                event.preventDefault();
                processCellContent(cell);
                moveToNextCell(cell, 'down');
            }
            break;
        case 'Tab':
            event.preventDefault();
            processCellContent(cell);
            moveToNextCell(cell, event.shiftKey ? 'left' : 'right');
            break;
        case 'Escape':
            cell.blur();
            break;
        case 'Delete':
        case 'Backspace':
            if (event.target === cell) {
                // 셀이 포커스되어 있고 선택된 상태라면 내용 삭제
                cell.textContent = '';
                delete cell.dataset.formula;
            }
            break;
    }
}

// 셀 입력 처리
function handleCellInput(event) {
    const cell = event.target.closest('td[contenteditable]');
        if (!cell) return;

    // 실시간으로 수식 바 업데이트
    updateFormulaBar();
}

// 수식 입력 처리
function handleFormulaInput(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        applyFormulaToSelectedCells();
    }
}

// 선택된 셀들을 수식에서 업데이트
function updateSelectedCellsFromFormula() {
    // 수식 바에서 입력할 때 선택된 셀들 업데이트
    updateFormulaBar();
}

// 전역 키보드 단축키
function handleGlobalKeyboard(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'z':
                if (!event.shiftKey) {
                    event.preventDefault();
                    undoAction();
                }
                break;
            case 'y':
                event.preventDefault();
                redoAction();
                break;
            case 'c':
                if (spreadsheetState.selectedCells.size > 0) {
                    event.preventDefault();
                    copySelectedCells();
                }
                break;
            case 'v':
                if (spreadsheetState.selectedCells.size > 0) {
                    event.preventDefault();
                    pasteCells();
                }
                break;
        }
    }
}

// 셀 내용 처리 (수식 평가)
function processCellContent(cell) {
    const content = cell.textContent.trim();
    
    if (content.startsWith('=')) {
        try {
            const result = evaluateFormulaSafely(content.substring(1), cell);
            cell.dataset.formula = content;
            cell.textContent = result;
            cell.setAttribute('title', `수식: ${content}`);
        } catch (error) {
            console.warn('수식 오류:', error);
            cell.textContent = '#ERROR';
            cell.setAttribute('title', `오류: ${error.message}`);
        }
    } else {
        delete cell.dataset.formula;
        cell.removeAttribute('title');
    }
}

// 안전한 수식 평가 (eval() 대체)
function evaluateFormulaSafely(formula, currentCell) {
    try {
        // 1. 입력 검증
        if (!formula || typeof formula !== 'string') {
            throw new Error('유효하지 않은 수식입니다.');
        }

        // 2. 악성 코드 패턴 검사
        const dangerousPatterns = [
            /javascript:/i,
            /document\./i,
            /window\./i,
            /eval\(/i,
            /function\s*\(/i,
            /=>/,
            /\bthis\b/,
            /prototype/i,
            /constructor/i,
            /import\s/i,
            /require\s*\(/i
        ];

        if (dangerousPatterns.some(pattern => pattern.test(formula))) {
            throw new Error('허용되지 않은 코드가 포함되어 있습니다.');
        }

        // 3. 셀 참조 처리
        let processedFormula = formula;
        const cellRefPattern = /([A-Z]+)(\d+)/g;
        const cellReferences = new Set();
        
        processedFormula = processedFormula.replace(cellRefPattern, (match, column, row) => {
            cellReferences.add(match);
            const targetCell = document.querySelector(`[data-cell="${match}"]`);
            
            if (!targetCell) return '0';
            
            // 순환 참조 방지
            if (targetCell === currentCell) {
                throw new Error('순환 참조가 감지되었습니다.');
            }
            
            let value = targetCell.textContent.trim();
            
            // 대상 셀이 수식인 경우
            if (value.startsWith('=')) {
                throw new Error('중첩 수식은 지원되지 않습니다.');
            }
            
            // 숫자 변환
            const numValue = parseFloat(value);
            return isNaN(numValue) ? '0' : numValue.toString();
        });

        // 4. 함수 처리
        for (const [funcName, funcImpl] of ALLOWED_FUNCTIONS) {
            const pattern = new RegExp(`\\b${funcName}\\s*\\(([^)]+)\\)`, 'gi');
            processedFormula = processedFormula.replace(pattern, (match, args) => {
                const argValues = args.split(',').map(arg => {
                    const trimmed = arg.trim();
                    const numValue = parseFloat(trimmed);
                    return isNaN(numValue) ? 0 : numValue;
                });
                
                return funcImpl(argValues);
            });
        }

        // 5. 범위 처리 (A1:A3 형태)
        const rangePattern = /([A-Z]+\d+):([A-Z]+\d+)/g;
        processedFormula = processedFormula.replace(rangePattern, (match, start, end) => {
            const values = getCellRange(start, end);
            return `[${values.join(',')}]`;
        });

        // 6. 허용된 문자만 사용하는지 검증
        const allowedChars = /^[0-9+\-*/().,\[\]\s]+$/;
        if (!allowedChars.test(processedFormula)) {
            throw new Error('허용되지 않은 문자가 포함되어 있습니다.');
        }

        // 7. 안전한 수학 연산 평가
        return safeMathEval(processedFormula);

    } catch (error) {
        throw new Error(`수식 오류: ${error.message}`);
    }
}

// 안전한 수학 연산 평가기
function safeMathEval(expression) {
    try {
        // 기본 수학 연산만 허용
        const sanitized = expression.replace(/[^0-9+\-*/().,\[\]\s]/g, '');
        
        // Function 생성자를 사용하되 매우 제한적으로
        const mathFunc = new Function('return (' + sanitized + ')');
        const result = mathFunc();
        
        if (typeof result !== 'number' || !isFinite(result)) {
            throw new Error('유효하지 않은 결과입니다.');
        }
        
        return result;
                } catch (error) {
        throw new Error('수식 계산 오류: ' + error.message);
    }
}

// 셀 범위 값 가져오기
function getCellRange(startCell, endCell) {
    // 시작과 끝 셀의 좌표 계산
    const startCol = getColumnIndex(startCell.match(/[A-Z]+/)[0]);
    const startRow = parseInt(startCell.match(/\d+/)[0]) - 1;
    const endCol = getColumnIndex(endCell.match(/[A-Z]+/)[0]);
    const endRow = parseInt(endCell.match(/\d+/)[0]) - 1;
    
    const values = [];
    
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
        for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
            const cellName = getColumnLabel(col) + (row + 1);
            const cell = document.querySelector(`[data-cell="${cellName}"]`);
            
            if (cell) {
                const value = parseFloat(cell.textContent.trim());
                values.push(isNaN(value) ? 0 : value);
            }
        }
    }
    
    return values;
}

// 열 인덱스 계산
function getColumnIndex(columnLabel) {
    let index = 0;
    for (let i = 0; i < columnLabel.length; i++) {
        index = index * 26 + (columnLabel.charCodeAt(i) - 64);
    }
    return index - 1;
}

// 다음 셀로 이동
function moveToNextCell(currentCell, direction) {
    const row = parseInt(currentCell.dataset.row);
    const col = parseInt(currentCell.dataset.col);
    
    let nextRow = row;
    let nextCol = col;
    
    switch (direction) {
        case 'up':
            nextRow = Math.max(0, row - 1);
            break;
        case 'down':
            nextRow = row + 1;
            break;
        case 'left':
            nextCol = Math.max(0, col - 1);
            break;
        case 'right':
            nextCol = col + 1;
            break;
    }
    
    const nextCell = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`);
                if (nextCell) {
                    nextCell.focus();
        clearSelection();
                    selectCell(nextCell);
        updateFormulaBar();
                }
            }

// 수식 바 업데이트
function updateFormulaBar() {
    const formulaInput = document.getElementById('formulaInput');
    if (!formulaInput) return;
    
    if (spreadsheetState.selectedCells.size === 1) {
        const cell = Array.from(spreadsheetState.selectedCells)[0];
        formulaInput.value = cell.dataset.formula || cell.textContent;
    } else {
        formulaInput.value = '';
    }
}

// 선택된 셀에 수식 적용
function applyFormulaToSelectedCells() {
    const formulaInput = document.getElementById('formulaInput');
    if (!formulaInput) return;
    
    const formula = formulaInput.value.trim();
    
    spreadsheetState.selectedCells.forEach(cell => {
        if (formula.startsWith('=')) {
            cell.textContent = formula;
            processCellContent(cell);
        } else {
            cell.textContent = formula;
            delete cell.dataset.formula;
        }
    });
}

// 셀 선택 관련 유틸리티 함수들
function clearSelection() {
    spreadsheetState.selectedCells.forEach(cell => {
        cell.classList.remove('selected');
    });
    spreadsheetState.selectedCells.clear();
}

function selectCell(cell) {
    cell.classList.add('selected');
    spreadsheetState.selectedCells.add(cell);
}

// 열 라벨 생성 함수 (개선된 알고리즘)
function getColumnLabel(index) {
    let label = '';
    let num = index;
    
    while (num >= 0) {
        label = String.fromCharCode(65 + (num % 26)) + label;
        num = Math.floor(num / 26) - 1;
        if (num < 0) break;
    }
    
    return label;
}

// 실행 취소/다시 실행
function undoAction() {
    if (typeof state !== 'undefined' && state.selectedNode) {
        if (spreadsheetState.undo(state.selectedNode)) {
            refreshSpreadsheetView();
        }
    }
}

function redoAction() {
    if (typeof state !== 'undefined' && state.selectedNode) {
        if (spreadsheetState.redo(state.selectedNode)) {
            refreshSpreadsheetView();
        }
    }
}

// 스프레드시트 뷰 새로고침
function refreshSpreadsheetView() {
    if (typeof state !== 'undefined' && state.selectedNode) {
        openSpreadsheetEditor(state.selectedNode);
    }
}

// 스프레드시트 저장 함수 (새 생성과 기존 수정 구분 처리)
async function saveSpreadsheetNode() {
    const table = document.getElementById('spreadsheetTable');
    const titleInput = document.getElementById('titleInput');
    const dateInput = document.getElementById('dateInput');

    if (!table || !titleInput || !dateInput) {
        console.error('필수 요소를 찾을 수 없습니다.');
        return;
    }

    try {
        // 데이터 수집 및 검증
        const headers = {};
        const rows = {};

        // 헤더 수집
        const headerCells = table.querySelectorAll('thead th[contenteditable]');
        headerCells.forEach((th, index) => {
            headers[index] = sanitizeInput(th.textContent);
        });

        // 행 데이터 수집
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach((tr, rowIndex) => {
            rows[rowIndex] = {};
            const cells = tr.querySelectorAll('td[contenteditable]');
            cells.forEach((td, colIndex) => {
                rows[rowIndex][colIndex] = sanitizeInput(td.textContent);
            });
        });

        // 제목 검증 (제목이 없으면 저장하지 않음)
        const newTitle = sanitizeInput(titleInput.value);
        if (!newTitle.trim()) {
            alert('제목을 입력해주세요.');
            titleInput.focus();
            return;
        }

        // 새 스프레드시트 생성인 경우
        if (!state.selectedNode && state.tempSpreadsheetData) {
            const now = new Date();
            // 더 안전한 ID 생성 방식 (숫자형으로 유지하되 유효성 강화)
            const timestamp = Date.now();
            const nodeId = parseInt(timestamp);
            
            // ID 유효성 검증
            if (!nodeId || isNaN(nodeId) || nodeId <= 0) {
                console.error('유효하지 않은 스프레드시트 노드 ID 생성됨:', nodeId);
                throw new Error('스프레드시트 노드 ID 생성에 실패했습니다.');
            }
            
            const newSpreadsheetNode = {
                id: nodeId,
                title: newTitle,
                content: '',
                spreadsheetData: { headers, rows },
                isSpreadsheet: true,
                x: state.tempSpreadsheetData.x,
                y: state.tempSpreadsheetData.y,
                baseX: state.tempSpreadsheetData.baseX,
                baseY: state.tempSpreadsheetData.baseY,
                folder: state.tempSpreadsheetData.folder,
                date: dateInput.value || new Date().toISOString().split('T')[0],
                vx: 0,
                vy: 0,
                mass: 1,
                phase: Math.random() * Math.PI * 2,
                style: {
                    backgroundColor: '#000000',
                    borderColor: '#4CAF50'
                },
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            console.log('새 스프레드시트 노드 생성:', {
                nodeId: nodeId,
                nodeType: typeof nodeId,
                isValidId: !isNaN(nodeId) && nodeId > 0,
                nodeData: newSpreadsheetNode
            });
            
            // Firebase에 저장
            await FirebaseManager.saveNode(newSpreadsheetNode);
            
            // 로컬 배열에 추가 (중복 방지)
            const existingIds = new Set(nodes.map(node => node.id.toString()));
            if (!existingIds.has(newSpreadsheetNode.id.toString())) {
                nodes.push(newSpreadsheetNode);
                console.log('스프레드시트 노드 로컬 배열에 추가 완료');
            } else {
                console.warn('중복 스프레드시트 노드 생성 방지:', nodeId);
            }
            
            // UI 업데이트
            if (typeof updateLinks === 'function') updateLinks();
            if (typeof render === 'function') render();
            closeEditor();
            
            // 임시 데이터 정리
            state.tempSpreadsheetData = null;
            
            showNotification('스프레드시트가 성공적으로 생성되었습니다.', 'success');
            return;
        }

        // 기존 스프레드시트 수정인 경우
        if (state.selectedNode) {
            // 히스토리 저장
            spreadsheetState.saveState(state.selectedNode);

            // 노드 데이터 업데이트
            state.selectedNode.spreadsheetData = { headers, rows };
            state.selectedNode.title = newTitle;
            state.selectedNode.date = dateInput.value;
            state.selectedNode.updatedAt = new Date().toISOString();

            // Firebase에 저장
            await FirebaseManager.saveNode(state.selectedNode);

            updateLinks();
            render();
            closeEditor();
            
            showNotification('스프레드시트가 수정되었습니다.', 'success');
        }
        
    } catch (error) {
        console.error('스프레드시트 저장 중 오류 발생:', error);
        showNotification('저장 중 오류가 발생했습니다.', 'error');
    }
}

// 입력값 무해화
function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return '';
    }
    
    // HTML 태그 제거
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.substring(0, 1000); // 길이 제한
}

// 알림 표시
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 스프레드시트 노드 생성 함수 (임시 데이터 생성 후 에디터에서 저장 시 실제 생성)
async function createSpreadsheetNode() {
    console.log('스프레드시트 에디터 열기 시작');
    
    try {
        const currentFolder = (typeof state !== 'undefined' && state.selectedFolder) ? state.selectedFolder : '/';

        const newX = window.innerWidth / 2 + (Math.random() * 200 - 100);
        const newY = window.innerHeight / 2 + (Math.random() * 200 - 100);

        // 30x30 크기로 확장된 스프레드시트 데이터 구조
        const spreadsheetData = {
            headers: {},
            rows: {}
        };

        // 30개 헤더 생성 (A-Z, AA-AD)
        for (let i = 0; i < 30; i++) {
            spreadsheetData.headers[i] = getColumnLabel(i);
        }

        // 30개 행 생성, 각 행마다 30개 열
        for (let row = 0; row < 30; row++) {
            spreadsheetData.rows[row] = {};
            for (let col = 0; col < 30; col++) {
                spreadsheetData.rows[row][col] = '';
            }
        }

        // 임시 스프레드시트 데이터 (저장 전까지는 실제 노드 생성하지 않음)
        const tempSpreadsheetData = {
            id: `spreadsheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: '',
            x: newX,
            y: newY,
            baseX: newX,
            baseY: newY,
            folder: currentFolder,
            date: new Date().toISOString().split('T')[0],
            isSpreadsheet: true,
            spreadsheetData: spreadsheetData,
            isNew: true // 새 스프레드시트임을 표시
        };

        console.log('임시 스프레드시트 데이터 생성 완료:', tempSpreadsheetData);

        // 스프레드시트 에디터 열기 (실제 노드 생성은 저장 시)
        openSpreadsheetEditorForNew(tempSpreadsheetData);
        
    } catch (error) {
        console.error('스프레드시트 노드 생성 중 오류:', error);
        if (typeof NodeManager !== 'undefined' && NodeManager.showErrorNotification) {
            NodeManager.showErrorNotification('스프레드시트 생성에 실패했습니다.', 'error');
        }
    }
}

// 새 스프레드시트를 위한 에디터 열기 함수
function openSpreadsheetEditorForNew(tempData) {
    const editor = document.getElementById('editor');
    if (!editor) {
        console.error('에디터 요소를 찾을 수 없습니다.');
        return;
    }

    // 스프레드시트 에디터용 스타일 적용
    Object.assign(editor.style, {
        width: '90%',
        maxWidth: '1400px',
        height: '85vh',
        maxHeight: '1000px',
        left: '50%',
        transform: 'translateX(-50%)',
        top: '7vh',
        padding: '20px'
    });

    // 데이터 안전성 검증
    const spreadsheetData = validateSpreadsheetData(tempData.spreadsheetData);
    const headers = Object.values(spreadsheetData.headers || {});
    const rows = Object.values(spreadsheetData.rows || {}).map(row => Object.values(row));

    // HTML 이스케이프 함수
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // 템플릿 리터럴로 안전한 HTML 생성
    editor.innerHTML = `
        <button type="button" class="spreadsheet-close-btn" onclick="closeEditor()" title="닫기">×</button>
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <input type="text" id="titleInput" placeholder="제목" value="${escapeHtml(tempData.title || '')}" 
                   style="font-size: 24px; color: #000000; width: 60%; background: white; border: 1px solid #ddd; padding: 8px;">
            <input type="date" id="dateInput" value="${tempData.date || new Date().toISOString().split('T')[0]}"
                   style="font-size: 16px; color: #000000; background: white; border: 1px solid #ddd; padding: 8px;">
        </div>
        
        <div class="spreadsheet-toolbar" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            <button type="button" class="spreadsheet-button" data-action="add-column" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">열 추가</button>
            <button type="button" class="spreadsheet-button" data-action="add-row" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">행 추가</button>
            <button type="button" class="spreadsheet-button" data-action="delete-selected" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">선택 삭제</button>
            <button type="button" class="spreadsheet-button" data-action="copy" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">복사</button>
            <button type="button" class="spreadsheet-button" data-action="paste" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">붙여넣기</button>
            <button type="button" class="spreadsheet-button" data-action="undo" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">실행 취소</button>
            <button type="button" class="spreadsheet-button" data-action="redo" style="color: #000000; background: white; border: 1px solid #ddd; padding: 6px 12px; margin: 2px; border-radius: 3px; cursor: pointer;">다시 실행</button>
        </div>
        
        <div class="formula-bar" style="margin-bottom: 10px;">
            <label for="formulaInput" style="color: #000000; font-weight: bold;">수식: </label>
            <input type="text" id="formulaInput" style="width: 70%; padding: 5px; color: #000000; background: white; border: 1px solid #ddd;" placeholder="수식을 입력하세요 (예: =SUM(A1:A3))">
        </div>
        
        <div class="spreadsheet-container" style="height: calc(100% - 220px); overflow: auto; border: 1px solid #ddd; background: white;">
            <table class="spreadsheet-table" id="spreadsheetTable" style="border-collapse: collapse; width: 100%; color: #000000;">
                <thead>
                    <tr>
                        <th style="width: 40px; background: #f0f0f0; user-select: none; color: #000000; border: 1px solid #ddd; padding: 4px;"></th>
                        ${headers.map((header, i) =>
                            `<th contenteditable="true" style="min-width: 120px; position: relative; color: #000000; background: #f8f8f8; border: 1px solid #ddd; padding: 4px;">${getColumnLabel(i)}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, rowIndex) => `
                        <tr>
                            <th style="background: #f0f0f0; user-select: none; color: #000000; border: 1px solid #ddd; padding: 4px;">${rowIndex + 1}</th>
                            ${row.map((cell, colIndex) =>
                                `<td contenteditable="true" 
                                     data-row="${rowIndex}" 
                                     data-col="${colIndex}"
                                     data-cell="${getColumnLabel(colIndex)}${rowIndex + 1}"
                                     style="padding: 4px; border: 1px solid #ddd; color: #000000; background: white; min-height: 20px;"
                                >${escapeHtml(cell?.toString() || '')}</td>`
                            ).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="editor-buttons" style="margin-top: 20px; text-align: right;">
            <button type="button" class="spreadsheet-button" data-action="save" style="color: #000000; background: #4CAF50; border: 1px solid #4CAF50; padding: 8px 16px; margin: 5px; border-radius: 4px; cursor: pointer; font-weight: bold;">저장</button>
        </div>
    `;

    // 이벤트 리스너 초기화
    initSpreadsheetEvents();
    
    // 임시 데이터를 state에 저장
    if (typeof state !== 'undefined') {
        state.tempSpreadsheetData = tempData;
        state.selectedNode = null; // 기존 노드가 아닌 새 스프레드시트임을 표시
    }
    
    editor.style.display = 'block';
}

// 열 추가 함수 (보안 강화)
function addSpreadsheetColumn() {
    const table = document.getElementById('spreadsheetTable');
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    const rows = table.querySelectorAll('tbody tr');
    const newColIndex = headerRow.children.length - 1; // -1은 행 번호 열 고려

    // 최대 열 수 제한 (성능 고려)
    if (newColIndex >= 100) {
        showNotification('최대 100개의 열까지만 추가할 수 있습니다.', 'error');
        return;
    }

    try {
    // 새 헤더 추가
    const newHeader = document.createElement('th');
    newHeader.contentEditable = true;
    newHeader.textContent = getColumnLabel(newColIndex);
        newHeader.style.cssText = 'min-width: 120px; position: relative;';
    headerRow.appendChild(newHeader);

    // 각 행에 새 셀 추가
        rows.forEach((row, rowIndex) => {
        const newCell = document.createElement('td');
        newCell.contentEditable = true;
            newCell.setAttribute('data-row', rowIndex);
        newCell.setAttribute('data-col', newColIndex);
            newCell.setAttribute('data-cell', `${getColumnLabel(newColIndex)}${rowIndex + 1}`);
            newCell.style.cssText = 'padding: 4px; border: 1px solid #ddd;';
        row.appendChild(newCell);
    });

        showNotification('열이 추가되었습니다.', 'success');
    } catch (error) {
        console.error('열 추가 중 오류:', error);
        showNotification('열 추가에 실패했습니다.', 'error');
    }
}

// 행 추가 함수 (보안 강화)
function addSpreadsheetRow() {
    const table = document.getElementById('spreadsheetTable');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const columnCount = table.querySelector('thead tr').children.length - 1; // -1은 행 번호 열 고려
    const newRowIndex = tbody.children.length;

    // 최대 행 수 제한 (성능 고려)
    if (newRowIndex >= 1000) {
        showNotification('최대 1000개의 행까지만 추가할 수 있습니다.', 'error');
        return;
    }

    try {
    const newRow = document.createElement('tr');

    // 행 번호 추가
    const rowHeader = document.createElement('th');
    rowHeader.textContent = newRowIndex + 1;
        rowHeader.style.cssText = 'background: #f0f0f0; user-select: none;';
    newRow.appendChild(rowHeader);

    // 셀 추가
    for (let i = 0; i < columnCount; i++) {
        const newCell = document.createElement('td');
        newCell.contentEditable = true;
        newCell.setAttribute('data-row', newRowIndex);
        newCell.setAttribute('data-col', i);
        newCell.setAttribute('data-cell', `${getColumnLabel(i)}${newRowIndex + 1}`);
            newCell.style.cssText = 'padding: 4px; border: 1px solid #ddd;';
        newRow.appendChild(newCell);
    }
        
    tbody.appendChild(newRow);
        showNotification('행이 추가되었습니다.', 'success');
    } catch (error) {
        console.error('행 추가 중 오류:', error);
        showNotification('행 추가에 실패했습니다.', 'error');
    }
}

// 복사/붙여넣기 함수들 (localStorage 대신 메모리 사용)
function copySelectedCells() {
    const selectedCells = Array.from(spreadsheetState.selectedCells);
    if (selectedCells.length === 0) {
        showNotification('복사할 셀을 선택해주세요.', 'error');
        return;
    }

    spreadsheetState.clipboard = selectedCells.map(cell => ({
        value: sanitizeInput(cell.textContent),
        formula: cell.dataset.formula || null
    }));

    showNotification(`${selectedCells.length}개 셀이 복사되었습니다.`, 'success');
}

function pasteCells() {
    if (spreadsheetState.clipboard.length === 0) {
        showNotification('붙여넣을 데이터가 없습니다.', 'error');
        return;
    }

    const selectedCells = Array.from(spreadsheetState.selectedCells);
    if (selectedCells.length === 0) {
        showNotification('붙여넣을 위치를 선택해주세요.', 'error');
        return;
    }

    const startCell = selectedCells[0];
    const startRow = parseInt(startCell.dataset.row);
    const startCol = parseInt(startCell.dataset.col);

    try {
        spreadsheetState.clipboard.forEach((data, index) => {
        const targetCell = document.querySelector(
            `[data-row="${startRow}"][data-col="${startCol + index}"]`
        );
            
        if (targetCell) {
            if (data.formula) {
                    targetCell.dataset.formula = data.formula;
                    targetCell.textContent = data.formula;
                    processCellContent(targetCell);
            } else {
                targetCell.textContent = data.value;
                    delete targetCell.dataset.formula;
            }
        }
    });

        showNotification('데이터가 붙여넣어졌습니다.', 'success');
    } catch (error) {
        console.error('붙여넣기 중 오류:', error);
        showNotification('붙여넣기에 실패했습니다.', 'error');
    }
}

// 선택된 셀 삭제 (보안 강화)
function deleteSelectedCells() {
    const selectedCells = Array.from(spreadsheetState.selectedCells);
    if (selectedCells.length === 0) {
        showNotification('삭제할 셀을 선택해주세요.', 'error');
        return;
    }

    try {
        selectedCells.forEach(cell => {
        cell.textContent = '';
            delete cell.dataset.formula;
            cell.removeAttribute('title');
        });

        showNotification(`${selectedCells.length}개 셀이 삭제되었습니다.`, 'success');
    } catch (error) {
        console.error('셀 삭제 중 오류:', error);
        showNotification('셀 삭제에 실패했습니다.', 'error');
    }
}

// CSS 스타일 추가
const spreadsheetStyles = document.createElement('style');
spreadsheetStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .spreadsheet-table td.selected {
        background-color: #e3f2fd !important;
        border: 2px solid #2196F3 !important;
    }
    
    .spreadsheet-table td:focus {
        outline: 2px solid #4CAF50;
        background-color: #f1f8e9;
    }
    
    .spreadsheet-button {
        padding: 6px 12px;
        margin: 0 4px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 14px;
    }
    
    .spreadsheet-button:hover {
        background: #f5f5f5;
    }
    
    .spreadsheet-button:active {
        background: #e0e0e0;
    }
    
    .formula-bar label {
        font-weight: bold;
        margin-right: 8px;
    }
`;

document.head.appendChild(spreadsheetStyles);

// 전역 함수로 노출
window.createSpreadsheetNode = createSpreadsheetNode;
window.openSpreadsheetEditor = openSpreadsheetEditor;
window.addSpreadsheetColumn = addSpreadsheetColumn;
window.addSpreadsheetRow = addSpreadsheetRow;
window.deleteSelectedCells = deleteSelectedCells;
window.copySelectedCells = copySelectedCells;
window.pasteCells = pasteCells;
window.saveSpreadsheetNode = saveSpreadsheetNode; 