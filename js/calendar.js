// 캘린더 렌더링 함수
function renderCalendar() {
    const calendarGrid = document.querySelector('.calendar-grid');
    const currentDate = state.calendar.currentDate;

    // 캘린더 헤더 수정
    const header = document.querySelector('#currentMonth');
    if (header) {
        header.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
    }

    // 이전 캘린더 내용 제거 (요일 헤더는 유지)
    const days = document.querySelectorAll('.calendar-day');
    days.forEach(day => day.remove());

    // 현재 월의 첫 날과 마지막 날
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    // 이전 월의 날짜들 추가
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const date = new Date(firstDay);
        date.setDate(date.getDate() - (firstDayOfWeek - i));
        calendarGrid.appendChild(createCalendarDay(date, false));
    }

    // 현재 월의 날짜들 추가
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
        calendarGrid.appendChild(createCalendarDay(new Date(date), true));
    }

    // 다음 월의 날짜들 추가
    const remainingDays = 42 - (firstDayOfWeek + lastDay.getDate()); // 6주 채우기
    for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(lastDay);
        date.setDate(lastDay.getDate() + i);
        calendarGrid.appendChild(createCalendarDay(date, false));
    }
}

// 캘린더 날짜 생성 함수
function createCalendarDay(date, isCurrentMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = date.getDate();

    if (!isCurrentMonth) {
        dayElement.classList.add('prev-month');
    }

    // 주말 색상 클래스 추가
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) { // 일요일
        dayElement.classList.add('sunday');
    } else if (dayOfWeek === 6) { // 토요일
        dayElement.classList.add('saturday');
    }

    // 해당 날짜에 노트가 있는지 확인
    const dateStr = formatDateToISO(date);
    const hasNotes = nodes.some(node => node.date === dateStr && !node.isFolder);
    if (hasNotes) {
        dayElement.classList.add('has-notes');
    }

    // 오늘 날짜인지 확인
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
    }

    // 클릭 이벤트 추가
    dayElement.addEventListener('click', (e) => {
        console.log('캘린더 날짜 클릭:', date.getFullYear(), date.getMonth(), date.getDate());
        e.stopPropagation();
        selectDate(date.getFullYear(), date.getMonth(), date.getDate());
    });

    return dayElement;
}

// 노드 투명도 복원 함수
function restoreNodes() {
    nodes.forEach(node => {
        node.opacity = 1;
    });
    
    // 테이블 제거
    const weekTable = document.querySelector('.week-table');
    if (weekTable) {
        weekTable.remove();
    }
    
    // 모바일 테이블 닫기
    const mobileTableContainer = document.querySelector('.mobile-calendar-table-container');
    if (mobileTableContainer) {
        mobileTableContainer.classList.remove('active');
    }
    
    render();
}

// 주간 날짜 계산 함수
function calculateWeekDates(selectedDate) {
    const weekDates = [];
    const dayOfWeek = selectedDate.getDay();

    // 이전 날짜들
    for (let i = 0; i < dayOfWeek; i++) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - (dayOfWeek - i));
        weekDates.push(formatDateToISO(date));
    }

    // 선택된 날짜
    weekDates.push(formatDateToISO(selectedDate));

    // 이후 날짜들
    for (let i = 1; i < 7 - dayOfWeek; i++) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + i);
        weekDates.push(formatDateToISO(date));
    }

    return weekDates;
}

// 노드 투명도 설정 함수
function setNodeOpacity(weekDates) {
    nodes.forEach(node => {
        if (!node.date || !weekDates.includes(node.date)) {
            node.opacity = 0.2;
        } else {
            node.opacity = 1;
        }
    });
}

// 새 노드 생성 함수
async function createNewNodeForDate(dateStr) {
    const currentDate = new Date(dateStr);
    
    // 새 노드 위치 계산
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = Math.random() * 200 - 100;
    const offsetY = Math.random() * 200 - 100;
    
    // 새 노드 생성
    const newNode = {
        id: Date.now(),
        title: `${currentDate.getMonth() + 1}/${currentDate.getDate()} 메모`,
        content: '',
        folder: '/',
        date: dateStr,
        x: centerX + offsetX,
        y: centerY + offsetY,
        baseX: centerX + offsetX,
        baseY: centerY + offsetY,
        vx: 0,
        vy: 0,
        mass: 1,
        phase: Math.random() * Math.PI * 2
    };
    
    // 노드 추가 및 저장
    nodes.push(newNode);
    await FirebaseManager.saveNode(newNode);
    
    return newNode;
}

// 테이블 노드 생성 함수
function createTableNode(node) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'table-node';
    nodeDiv.style.cssText = `
        background: ${node.style?.backgroundColor || node.emotion || '#000000'};
        color: white;
        padding: 8px;
        border-radius: 4px;
        margin: 4px 0;
        cursor: pointer;
        width: 300px;
    `;
    nodeDiv.innerHTML = `
        <div style="font-weight: bold; font-size: 12px;">${node.title}</div>
        <div style="font-size: 10px; opacity: 0.8;">${node.content.substring(0, 30)}${node.content.length > 30 ? '...' : ''}</div>
    `;
    nodeDiv.addEventListener('click', () => openEditor(node));
    return nodeDiv;
}

// 빈 날짜 메시지 생성 함수
function createEmptyDateMessage(dateStr, isMobile = false) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = isMobile ? 'mobile-empty-note' : 'empty-note';
    emptyMsg.textContent = '노트가 없습니다';
    emptyMsg.style.cssText = `
        color: #888;
        padding: 10px;
        cursor: pointer;
    `;
    
    emptyMsg.addEventListener('click', async () => {
        const newNode = await createNewNodeForDate(dateStr);
        
        // 테이블 닫기
        restoreNodes();
        
        // 에디터 열기
        openEditor(newNode);
        render();
    });
    
    return emptyMsg;
}

// 데스크톱 테이블 생성 함수
function createDesktopTable(weekDates, selectedDateStr) {
    const table = document.createElement('table');
    table.className = 'week-table';
    table.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-collapse: collapse;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 999;
        width: auto;
        max-height: 80vh;
        font-family: 'Noto Sans KR', sans-serif;
        overflow-y: auto;
        margin: 20px;
        min-width: 400px;
        position: relative;
    `;

    // 닫기 버튼 추가
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 22px;
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        z-index: 1001;
    `;
    closeBtn.onclick = () => {
        table.remove();
        restoreNodes();
    };
    table.appendChild(closeBtn);

    // 각 날짜별로 행 생성
    weekDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        const tr = document.createElement('tr');

        // 날짜 헤더 셀
        const th = document.createElement('th');
        th.style.cssText = `
            padding: 15px;
            background: ${dateStr === selectedDateStr ? '#000000' : '#f5f5f5'};
            color: ${dateStr === selectedDateStr ? 'white' : 'black'};
            border: 1px solid #ddd;
            text-align: left;
            min-width: 100px;
        `;
        th.textContent = `${date.getMonth() + 1}/${date.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
        tr.appendChild(th);

        // 노드 셀
        const td = document.createElement('td');
        td.style.cssText = `
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
            vertical-align: top;
        `;

        // 해당 날짜의 노드들 추가
        const dateNodes = nodes.filter(node => node.date === dateStr && !node.isFolder);
        
        if (dateNodes.length === 0) {
            td.appendChild(createEmptyDateMessage(dateStr));
        } else {
            dateNodes.forEach(node => {
                td.appendChild(createTableNode(node));
            });
        }

        tr.appendChild(td);
        table.appendChild(tr);
    });

    return table;
}

// 모바일 테이블 생성 함수
function createMobileTable(weekDates, selectedDateStr) {
    const mobileTableContainer = document.querySelector('.mobile-calendar-table-container');
    const mobileTableContent = document.querySelector('.mobile-table-content');
    
    if (!mobileTableContainer || !mobileTableContent) return;
    
    mobileTableContent.innerHTML = '';
    
    // 제목 업데이트
    const selectedDate = new Date(selectedDateStr);
    const tableHeader = document.querySelector('.mobile-table-header h3');
    if (tableHeader) {
        tableHeader.textContent = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일의 노트`;
    }
    
    // 각 날짜별 노드 추가
    weekDates.forEach((dateStr) => {
        const date = new Date(dateStr);
        
        // 날짜 헤더 생성
        const dateHeader = document.createElement('div');
        dateHeader.className = 'mobile-date-header';
        dateHeader.style.cssText = `
            padding: 10px;
            background: ${dateStr === selectedDateStr ? '#000000' : '#f5f5f5'};
            color: ${dateStr === selectedDateStr ? 'white' : 'black'};
            font-weight: bold;
            margin-top: 10px;
            border-radius: 4px;
        `;
        dateHeader.textContent = `${date.getMonth() + 1}/${date.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
        mobileTableContent.appendChild(dateHeader);
        
        // 해당 날짜의 노드들 추가
        const dateNodes = nodes.filter(node => node.date === dateStr && !node.isFolder);
        
        if (dateNodes.length === 0) {
            mobileTableContent.appendChild(createEmptyDateMessage(dateStr, true));
        } else {
            dateNodes.forEach(node => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'mobile-table-node';
                nodeDiv.style.cssText = `
                    background: ${node.style?.backgroundColor || node.emotion || '#000000'};
                    color: white;
                    padding: 12px;
                    border-radius: 4px;
                    margin: 8px 0;
                    cursor: pointer;
                `;
                nodeDiv.innerHTML = `
                    <div style="font-weight: bold; font-size: 14px;">${node.title}</div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${node.content.substring(0, 30)}${node.content.length > 30 ? '...' : ''}</div>
                `;
                nodeDiv.addEventListener('click', () => {
                    openEditor(node);
                    mobileTableContainer.classList.remove('active');
                });
                mobileTableContent.appendChild(nodeDiv);
            });
        }
    });
    
    // 모바일 테이블 표시
    mobileTableContainer.classList.add('active');
    
    // 닫기 버튼 이벤트
    const closeBtn = document.querySelector('.mobile-table-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            mobileTableContainer.classList.remove('active');
            restoreNodes();
        };
    }
}

// 캔버스 클릭 이벤트 리스너 추가 함수
function addCanvasClickListener() {
    const canvas = document.getElementById('canvas');
    
    function cleanup(e) {
        if (e.target === canvas) {
            const table = document.querySelector('.week-table');
            if (table) {
                table.remove();
            }
            restoreNodes();
            canvas.removeEventListener('click', cleanup);
        }
    }
    
    canvas.addEventListener('click', cleanup);
}

// 캘린더 하단 노트 목록 업데이트 함수
// 캘린더 하단 노트 타임라인: 오늘을 중심으로 전체 노드를 날짜순으로, 미지정은 맨 위
function updateCalendarNotesList(focusDateStr) {
    const notesList = document.querySelector('.calendar-notes-list');
    const notesTitle = document.querySelector('.calendar-notes-title');
    if (!notesList) return;

    const todayStr = formatDateToISO(new Date());
    const focus = focusDateStr || todayStr;
    if (notesTitle) notesTitle.textContent = '노트 타임라인';

    notesList.innerHTML = '';

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const all = (window.nodes || nodes || []).filter(n => n && !n.isFolder);
    const undated = all.filter(n => !n.date);
    const dated = all.filter(n => n.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    function buildNoteItem(node) {
        const item = document.createElement('div');
        item.className = 'calendar-note-item';
        const folderColor = typeof getFolderColor === 'function' ? getFolderColor(node.folder || '/') : '#3b82f6';
        const folderLabel = (node.folder && node.folder !== '/') ? node.folder.split('/').filter(Boolean).pop() : '우주';
        // 제목(왼쪽) + 폴더 배지(오른쪽) 1행
        item.innerHTML = `
            <span class="note-title">${node.title || '제목 없음'}</span>
            <span class="note-folder-badge" style="background:${folderColor}20;color:${folderColor};">${folderLabel}</span>
        `;
        // 클릭: 에디터 대신 캔버스에서 해당 노드를 가운데로 이동 + 반짝임
        item.addEventListener('click', () => {
            if (typeof locateNodeOnCanvas === 'function') locateNodeOnCanvas(node);
            else if (typeof openEditor === 'function') openEditor(node);
        });
        // 더블클릭: 에디터 열기
        item.addEventListener('dblclick', () => { if (typeof openEditor === 'function') openEditor(node); });
        return item;
    }

    // 날짜 미지정 노드: 맨 상단
    if (undated.length) {
        const h = document.createElement('div');
        h.className = 'cal-tl-header undated';
        h.textContent = `날짜 미지정 (${undated.length})`;
        notesList.appendChild(h);
        undated.forEach(n => notesList.appendChild(buildNoteItem(n)));
    }

    // 날짜별 그룹 (오름차순)
    let lastDate = null;
    dated.forEach(n => {
        if (n.date !== lastDate) {
            lastDate = n.date;
            const d = new Date(n.date);
            const dh = document.createElement('div');
            dh.className = 'cal-tl-header' + (n.date === todayStr ? ' today' : '');
            dh.dataset.date = n.date;
            dh.textContent = `${d.getMonth() + 1}/${d.getDate()} (${dayNames[d.getDay()]})` + (n.date === todayStr ? ' · 오늘' : '');
            notesList.appendChild(dh);
        }
        notesList.appendChild(buildNoteItem(n));
    });

    if (!undated.length && !dated.length) {
        const empty = document.createElement('div');
        empty.className = 'calendar-notes-empty';
        empty.textContent = '노트가 없습니다';
        notesList.appendChild(empty);
        return;
    }

    // 오늘(또는 선택 날짜)을 목록 가운데로 스크롤 (동기 처리 - 비활성 탭에서도 동작)
    const headerArr = Array.from(notesList.querySelectorAll('.cal-tl-header[data-date]'));
    const target = headerArr.find(h => h.dataset.date === focus)
        || headerArr.find(h => h.dataset.date >= focus)
        || headerArr[headerArr.length - 1];
    if (target) {
        const lr = notesList.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        notesList.scrollTop += (tr.top - lr.top) - (notesList.clientHeight / 2) + (tr.height / 2);
    }
}

// 날짜 선택 메인 함수 (통합 패널 버전)
function selectDate(year, month, day) {
    console.log('selectDate 함수 실행:', year, month, day);

    // 선택된 날짜 설정
    const selectedDate = new Date(year, month, day);
    state.calendar.selectedDate = selectedDate;
    const selectedDateStr = formatDateToISO(selectedDate);
    console.log('선택된 날짜:', selectedDateStr);

    // 기존 선택된 날짜 클래스 제거
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // 새로 선택된 날짜에 클래스 추가
    const allDays = document.querySelectorAll('.calendar-day');
    allDays.forEach(dayEl => {
        const dayNum = parseInt(dayEl.textContent);
        const isPrevMonth = dayEl.classList.contains('prev-month');
        const isNextMonth = dayEl.classList.contains('next-month');

        if (!isPrevMonth && !isNextMonth && dayNum === day) {
            dayEl.classList.add('selected');
        }
    });

    // 캘린더 하단 노트 목록 업데이트
    updateCalendarNotesList(selectedDateStr);

    // 주간 날짜 계산 및 노드 투명도 설정 (캔버스에서 해당 날짜 노드 강조)
    const weekDates = calculateWeekDates(selectedDate);
    setNodeOpacity(weekDates);

    render();
}

// 이전 달 이동
function prevMonth() {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() - 1);
    renderCalendar();
}

// 다음 달 이동
function nextMonth() {
    state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + 1);
    renderCalendar();
}

// 이전 날짜로 이동
function goToPrevDate() {
    if (!state.calendar.selectedDate) {
        state.calendar.selectedDate = new Date();
    }
    const prevDate = new Date(state.calendar.selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);

    // 월이 바뀌면 캘린더도 업데이트
    if (prevDate.getMonth() !== state.calendar.currentDate.getMonth() ||
        prevDate.getFullYear() !== state.calendar.currentDate.getFullYear()) {
        state.calendar.currentDate = new Date(prevDate);
        renderCalendar();
    }

    selectDate(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
}

// 다음 날짜로 이동
function goToNextDate() {
    if (!state.calendar.selectedDate) {
        state.calendar.selectedDate = new Date();
    }
    const nextDate = new Date(state.calendar.selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // 월이 바뀌면 캘린더도 업데이트
    if (nextDate.getMonth() !== state.calendar.currentDate.getMonth() ||
        nextDate.getFullYear() !== state.calendar.currentDate.getFullYear()) {
        state.calendar.currentDate = new Date(nextDate);
        renderCalendar();
    }

    selectDate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
}

// 캘린더 전체 휠 이벤트 차단 (캔버스 확대/축소 방지)
function initCalendarWheelBlock() {
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;

    calendarContainer.addEventListener('wheel', (e) => {
        // 캔버스로 이벤트 전파 차단
        e.stopPropagation();
    }, { passive: false });
}

// 노트 섹션 휠 이벤트 초기화
function initCalendarNotesWheelEvent() {
    const notesSection = document.querySelector('.calendar-notes-section');
    if (!notesSection) return;

    let wheelTimeout = null;
    let isScrolling = false;

    notesSection.addEventListener('wheel', (e) => {
        // 캔버스로 이벤트 전파 차단
        e.stopPropagation();

        // 노트 목록에 스크롤 가능한 내용이 있으면 기본 스크롤 허용
        const notesList = document.querySelector('.calendar-notes-list');
        if (notesList) {
            const hasScrollableContent = notesList.scrollHeight > notesList.clientHeight;
            const isAtTop = notesList.scrollTop === 0;
            const isAtBottom = notesList.scrollTop + notesList.clientHeight >= notesList.scrollHeight - 1;

            // 스크롤 가능한 내용이 있고 중간에 있으면 기본 스크롤
            if (hasScrollableContent && !isAtTop && !isAtBottom) {
                return;
            }

            // 위로 스크롤하는데 이미 맨 위거나, 아래로 스크롤하는데 이미 맨 아래면 날짜 이동
            if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom) || !hasScrollableContent) {
                e.preventDefault();

                // 디바운스로 너무 빠른 연속 이동 방지
                if (isScrolling) return;
                isScrolling = true;

                if (e.deltaY > 0) {
                    // 아래로 스크롤 = 다음 날짜
                    goToNextDate();
                } else {
                    // 위로 스크롤 = 이전 날짜
                    goToPrevDate();
                }

                // 300ms 후에 다시 스크롤 가능
                clearTimeout(wheelTimeout);
                wheelTimeout = setTimeout(() => {
                    isScrolling = false;
                }, 300);
            }
        }
    }, { passive: false });
}

// DOM 로드 후 휠 이벤트 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연 후 초기화 (캘린더가 렌더링된 후)
    setTimeout(() => {
        initCalendarWheelBlock();
        initCalendarNotesWheelEvent();
    }, 500);
}); 