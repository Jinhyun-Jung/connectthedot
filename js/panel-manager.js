// 패널 관리를 위한 코드
function initPanelSystem() {
    const calendar = document.querySelector('.calendar-container');
    const folder = document.querySelector('.folder-container');

    // 클래스 추가
    calendar.classList.add('panel');
    folder.classList.add('panel');

    // 초기 상태 설정
    calendar.classList.add('hidden');
    folder.classList.add('hidden');

    // 버튼 표시
    const showFolderBtn = document.querySelector('.show-folder-btn');
    const showCalendarBtn = document.querySelector('.show-calendar-btn');
    showFolderBtn.style.display = 'flex';
    showCalendarBtn.style.display = 'flex';

    // 폴더뷰: 캔버스의 노드를 클릭한 경우에만 자동으로 닫음
    document.addEventListener('click', (e) => {
        if (folder.classList.contains('hidden')) return;
        if (e.target.closest('.folder-container')) return;
        if (e.target.closest('.show-folder-btn')) return;
        if (e.target.closest('.node')) {
            toggleFolderView();
        }
    });

    // 캘린더: 외부 클릭 시 닫기 유지
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.calendar-container') &&
            !e.target.closest('.show-calendar-btn') &&
            !calendar.classList.contains('hidden')) {
            toggleCalendarView();
        }
    });
}

// 일반화된 패널 토글 함수
function togglePanel(panelSelector, buttonSelector, storageKey) {
    const panel = document.querySelector(panelSelector);
    const button = document.querySelector(buttonSelector);
    
    if (!panel || !button) return;
    
    panel.classList.toggle('hidden');
    button.classList.toggle('active');
    
    // 특정 패널에 대한 추가 동작 수행
    if (panelSelector === '.calendar-container' && !panel.classList.contains('hidden')) {
        renderCalendar();
    }
    
    // 상태 저장
    localStorage.setItem(storageKey, panel.classList.contains('hidden'));
    
    // 폴더 버튼은 항상 표시
    if (buttonSelector === '.show-folder-btn') {
        button.style.display = 'block';
    }
}

// toggleCalendarView 함수 - togglePanel 사용
function toggleCalendarView() {
    togglePanel('.calendar-container', '.show-calendar-btn', 'calendarViewHidden');
}

// toggleFolderView 함수 - togglePanel 사용
function toggleFolderView() {
    togglePanel('.folder-container', '.show-folder-btn', 'folderViewHidden');
} 