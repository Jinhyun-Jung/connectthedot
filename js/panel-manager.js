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

    // 폴더뷰/캘린더뷰는 캔버스나 외부를 클릭해도 닫히지 않는다.
    // 오직 헤더의 닫기(×) 버튼으로만 닫힌다. (자동 닫힘 동작 제거)
}

// 일반화된 패널 토글 함수
function togglePanel(panelSelector, buttonSelector, storageKey) {
    const panel = document.querySelector(panelSelector);
    const button = document.querySelector(buttonSelector);
    
    if (!panel || !button) return;
    
    panel.classList.toggle('hidden');
    button.classList.toggle('active');

    const nowVisible = !panel.classList.contains('hidden');

    // 좌측 패널은 한 번에 하나만: 이 패널을 열면 반대 패널은 닫는다
    if (nowVisible) {
        const otherSelector = panelSelector === '.calendar-container' ? '.folder-container' : '.calendar-container';
        const otherBtnSelector = panelSelector === '.calendar-container' ? '.show-folder-btn' : '.show-calendar-btn';
        const other = document.querySelector(otherSelector);
        const otherBtn = document.querySelector(otherBtnSelector);
        if (other && !other.classList.contains('hidden')) {
            other.classList.add('hidden');
            if (otherBtn) otherBtn.classList.remove('active');
        }
    }

    // 특정 패널에 대한 추가 동작 수행
    if (panelSelector === '.calendar-container' && nowVisible) {
        renderCalendar();
        // 캘린더 아래 노트 타임라인 (오늘 기준)
        if (typeof updateCalendarNotesList === 'function') {
            updateCalendarNotesList(formatDateToISO(new Date()));
        }
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