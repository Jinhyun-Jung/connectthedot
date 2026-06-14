// 서식 도구 이벤트 리스너 추가
function initFormattingTools() {
    // 기본 요소
    const contentInput = document.getElementById('contentInput');
    const fontFamilySelect = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');
    const formatButtons = document.querySelectorAll('.toolbar-btn[data-format]');
    const alignButtons = document.querySelectorAll('.toolbar-btn[data-align]');
    const boldButton = document.querySelector('.toolbar-btn[data-format="bold"]');
    const italicButton = document.querySelector('.toolbar-btn[data-format="italic"]');
    const underlineButton = document.querySelector('.toolbar-btn[data-format="underline"]');
    const strikethroughButton = document.querySelector('.toolbar-btn[data-format="strikethrough"]');
    const highlightButton = document.querySelector('.toolbar-btn[data-format="highlight"]');
    const ulButton = document.querySelector('.toolbar-btn[data-format="ul"]');
    const olButton = document.querySelector('.toolbar-btn[data-format="ol"]');
    const fontSizeDecrease = document.getElementById('fontSizeDecrease');
    const fontSizeIncrease = document.getElementById('fontSizeIncrease');
    
    // 색상 관련 요소
    const textColorBtn = document.getElementById('textColorBtn');
    const bgColorBtn = document.getElementById('bgColorBtn');
    const textColorIndicator = document.getElementById('textColorIndicator');
    const bgColorIndicator = document.getElementById('bgColorIndicator');
    const colorPopup = document.getElementById('colorPopup');
    const colorPopupTitle = document.getElementById('colorPopupTitle');
    const colorPopupClose = document.getElementById('colorPopupClose');
    const customColorPicker = document.getElementById('customColorPicker');
    const textColorPresets = document.querySelectorAll('.text-color-preset');
    const bgColorPresets = document.querySelectorAll('.bg-color-preset');
    
    // 현재 선택된 색상 저장 변수
    let currentTextColor = '#000000';
    let currentBgColor = '#FFFFFF';
    
    // 현재 열린 색상 모드 (text 또는 bg)
    let currentColorMode = null;

    // 텍스트 드래그 문제 해결 - 이벤트 전파 중단
    contentInput.addEventListener('mousedown', function(e) {
        e.stopPropagation();
    });
    
    // 단축키 처리 - Ctrl+B, Ctrl+I, Ctrl+U 지원
    contentInput.addEventListener('keydown', function(e) {
        // Ctrl+B (굵게)
        if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
            e.preventDefault();
            toggleBold();
            if (boldButton) boldButton.classList.toggle('active');
        }
        // Ctrl+I (기울임)
        else if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
            e.preventDefault();
            toggleItalic();
            if (italicButton) italicButton.classList.toggle('active');
        }
        // Ctrl+U (밑줄)
        else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
            toggleUnderline();
            if (underlineButton) underlineButton.classList.toggle('active');
        }
    });

    // 굵게 토글 함수
    function toggleBold() {
        if (contentInput.style.fontWeight === 'bold') {
            contentInput.style.fontWeight = 'normal';
        } else {
            contentInput.style.fontWeight = 'bold';
        }
        
        // 변경사항 실시간 저장
        if (state.selectedNode) {
            state.selectedNode.fontWeight = contentInput.style.fontWeight;
        }
    }
    
    // 기울임 토글 함수
    function toggleItalic() {
        if (contentInput.style.fontStyle === 'italic') {
            contentInput.style.fontStyle = 'normal';
        } else {
            contentInput.style.fontStyle = 'italic';
        }
        
        // 변경사항 실시간 저장
        if (state.selectedNode) {
            state.selectedNode.fontStyle = contentInput.style.fontStyle;
        }
    }
    
    // 밑줄 토글 함수
    function toggleUnderline() {
        if (contentInput.style.textDecoration === 'underline' || contentInput.style.textDecoration.includes('underline')) {
            contentInput.style.textDecoration = 'none';
            contentInput.style.setProperty('text-decoration', 'none', 'important');
        } else {
            contentInput.style.textDecoration = 'underline';
            contentInput.style.setProperty('text-decoration', 'underline', 'important');
        }
        
        if (state.selectedNode) {
            state.selectedNode.textDecoration = contentInput.style.textDecoration;
        }
    }
    
    // 취소선 토글 함수
    function toggleStrikethrough() {
        if (contentInput.style.textDecoration === 'line-through' || contentInput.style.textDecoration.includes('line-through')) {
            contentInput.style.textDecoration = 'none';
            contentInput.style.setProperty('text-decoration', 'none', 'important');
        } else {
            contentInput.style.textDecoration = 'line-through';
            contentInput.style.setProperty('text-decoration', 'line-through', 'important');
        }
        
        if (state.selectedNode) {
            state.selectedNode.textDecoration = contentInput.style.textDecoration;
        }
    }
    
    // 하이라이트 토글 함수
    function toggleHighlight() {
        if (contentInput.style.backgroundColor && contentInput.style.backgroundColor !== 'transparent' && contentInput.style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            // 현재 배경색이 하이라이트 색상인지 확인
            const bgColor = contentInput.style.backgroundColor;
            if (bgColor === 'rgb(255, 255, 0)' || bgColor === 'yellow' || bgColor === '#ffff00') {
                contentInput.style.backgroundColor = 'transparent';
                contentInput.style.setProperty('background-color', 'transparent', 'important');
            } else {
                contentInput.style.backgroundColor = 'yellow';
                contentInput.style.setProperty('background-color', 'yellow', 'important');
            }
        } else {
            contentInput.style.backgroundColor = 'yellow';
            contentInput.style.setProperty('background-color', 'yellow', 'important');
        }
        
        if (state.selectedNode) {
            state.selectedNode.highlight = contentInput.style.backgroundColor;
        }
    }

    // 글꼴 변경 - 실시간 반영
    fontFamilySelect.addEventListener('change', function() {
        applyFontFamily(this.value);
    });
    
    // 글꼴 적용 함수
    function applyFontFamily(value) {
        // 기존 폰트 클래스 제거
        contentInput.classList.remove('font-noto-sans', 'font-noto-serif', 'font-gulim', 'font-batang');
        
        // 선택된 폰트에 따라 클래스 추가
        if (value.includes('Noto Sans')) {
            contentInput.classList.add('font-noto-sans');
        } else if (value.includes('Noto Serif')) {
            contentInput.classList.add('font-noto-serif');
        } else if (value.includes('Gulim')) {
            contentInput.classList.add('font-gulim');
        } else if (value.includes('Batang')) {
            contentInput.classList.add('font-batang');
        }
        
        // 직접 스타일 속성도 설정 (important 추가)
        contentInput.style.fontFamily = value;
        contentInput.style.setProperty('font-family', value, 'important');
        
        // 현재 선택된 노드의 폰트 패밀리 값 저장
        if (state.selectedNode) {
            state.selectedNode.fontFamily = value;
        }
    }

    // 글자 크기 변경 - 실시간 반영
    fontSizeInput.addEventListener('input', function() {
        applyFontSize(this.value);
    });
    
    // 글자 크기 증가
    if (fontSizeIncrease) {
        fontSizeIncrease.addEventListener('click', function() {
            const currentSize = parseInt(fontSizeInput.value) || 12;
            const newSize = Math.min(currentSize + 1, 72);
            fontSizeInput.value = newSize;
            applyFontSize(newSize);
        });
    }
    
    // 글자 크기 감소
    if (fontSizeDecrease) {
        fontSizeDecrease.addEventListener('click', function() {
            const currentSize = parseInt(fontSizeInput.value) || 12;
            const newSize = Math.max(currentSize - 1, 8);
            fontSizeInput.value = newSize;
            applyFontSize(newSize);
        });
    }
    
    // 글자 크기 적용 함수
    function applyFontSize(size) {
        const fontSize = size + 'pt';
        contentInput.style.fontSize = fontSize;
        contentInput.style.setProperty('font-size', fontSize, 'important');
        
        // 현재 선택된 노드의 폰트 사이즈 값 저장
        if (state.selectedNode) {
            state.selectedNode.fontSize = fontSize;
        }
    }
    
    // ===== 색상 선택 로직 =====
    
    // 글자색 버튼 클릭
    if (textColorBtn) {
        textColorBtn.addEventListener('click', function() {
            showColorPopup('text');
        });
    }
    
    // 배경색 버튼 클릭
    if (bgColorBtn) {
        bgColorBtn.addEventListener('click', function() {
            showColorPopup('bg');
        });
    }
    
    // 색상 팝업 표시 함수
    function showColorPopup(mode) {
        currentColorMode = mode;
        
        // 팝업 제목 설정
        colorPopupTitle.textContent = mode === 'text' ? '글자 색상 선택' : '배경 색상 선택';
        
        // 프리셋 표시/숨김 설정
        colorPopup.classList.remove('show-text-presets', 'show-bg-presets');
        colorPopup.classList.add(mode === 'text' ? 'show-text-presets' : 'show-bg-presets');
        
        // 현재 색상 설정
        customColorPicker.value = mode === 'text' ? currentTextColor : currentBgColor;
        
        // 팝업 표시
        colorPopup.style.display = 'block';
        
        // 모드에 따라 프리셋 활성화 상태 업데이트
        if (mode === 'text') {
            textColorPresets.forEach(preset => {
                preset.classList.toggle('active', preset.dataset.color === currentTextColor);
            });
        } else {
            bgColorPresets.forEach(preset => {
                preset.classList.toggle('active', preset.dataset.color === currentBgColor);
            });
        }
    }
    
    // 색상 팝업 닫기
    if (colorPopupClose) {
        colorPopupClose.addEventListener('click', function() {
            colorPopup.style.display = 'none';
            currentColorMode = null;
        });
    }
    
    // 글자색 프리셋 클릭
    textColorPresets.forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            applyTextColor(color);
            updateTextColorIndicator(color);
            
            // 프리셋 버튼 활성화 상태 업데이트
            textColorPresets.forEach(preset => {
                preset.classList.toggle('active', preset === this);
            });
            
            // 사용자 정의 색상 값도 업데이트
            customColorPicker.value = color;
            
            // 팝업 닫기
            colorPopup.style.display = 'none';
        });
    });
    
    // 배경색 프리셋 클릭
    bgColorPresets.forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            applyBgColor(color);
            updateBgColorIndicator(color);
            
            // 프리셋 버튼 활성화 상태 업데이트
            bgColorPresets.forEach(preset => {
                preset.classList.toggle('active', preset === this);
            });
            
            // 사용자 정의 색상 값도 업데이트
            customColorPicker.value = color;
            
            // 팝업 닫기
            colorPopup.style.display = 'none';
        });
    });
    
    // 사용자 정의 색상 선택
    if (customColorPicker) {
        customColorPicker.addEventListener('input', function() {
            const color = this.value;
            
            if (currentColorMode === 'text') {
                applyTextColor(color);
                updateTextColorIndicator(color);
                textColorPresets.forEach(preset => {
                    preset.classList.toggle('active', preset.dataset.color === color);
                });
            } else if (currentColorMode === 'bg') {
                applyBgColor(color);
                updateBgColorIndicator(color);
                bgColorPresets.forEach(preset => {
                    preset.classList.toggle('active', preset.dataset.color === color);
                });
            }
        });
        
        // 색상 선택 후 적용 버튼 클릭 효과
        customColorPicker.addEventListener('change', function() {
            // 팝업 닫기
            setTimeout(() => {
                colorPopup.style.display = 'none';
            }, 300);
        });
    }
    
    // 글자색 적용 함수
    function applyTextColor(color) {
        currentTextColor = color;
        contentInput.style.color = color;
        contentInput.style.setProperty('color', color, 'important');
        
        // 현재 선택된 노드의 글자 색상 저장
        if (state.selectedNode) {
            state.selectedNode.textColor = color;
        }
    }
    
    // 배경색 적용 함수 - !important 속성 사용하여 확실히 적용
    function applyBgColor(color) {
        currentBgColor = color;
        
        // 직접 스타일 속성 설정
        contentInput.style.backgroundColor = color;
        contentInput.style.setProperty('background-color', color, 'important');
        
        // 추가적인 확실한 적용을 위해 인라인 스타일 강제 설정
        const currentStyle = contentInput.getAttribute('style') || '';
        const newStyle = currentStyle.replace(/background-color:[^;]+;?/gi, '') + 
                          `background-color: ${color} !important;`;
        contentInput.setAttribute('style', newStyle);
        
        // 현재 선택된 노드의 배경 색상 저장
        if (state.selectedNode) {
            state.selectedNode.bgColor = color;
        }
        
        // 콘솔에 로그 출력 (디버깅용)
        console.log(`배경색 적용: ${color}`);
        console.log('스타일 확인:', contentInput.getAttribute('style'));
    }
    
    // 글자색 인디케이터 업데이트
    function updateTextColorIndicator(color) {
        if (textColorIndicator) {
            textColorIndicator.style.backgroundColor = color;
            
            // 색상이 어두운 경우 글자를 밝게
            const brightness = getBrightness(color);
            textColorBtn.style.color = brightness < 128 ? 'white' : 'black';
        }
    }
    
    // 배경색 인디케이터 업데이트
    function updateBgColorIndicator(color) {
        if (bgColorIndicator) {
            bgColorIndicator.style.backgroundColor = color;
            
            // 테두리 추가 (흰색인 경우 구분을 위해)
            bgColorIndicator.style.border = color.toLowerCase() === '#ffffff' ? '1px solid #ccc' : 'none';
        }
    }
    
    // 외부 클릭 시 팝업 닫기
    document.addEventListener('click', function(e) {
        if (colorPopup && colorPopup.style.display === 'block' && 
            !colorPopup.contains(e.target) && 
            e.target !== textColorBtn && 
            e.target !== bgColorBtn &&
            !textColorBtn.contains(e.target) &&
            !bgColorBtn.contains(e.target)) {
            colorPopup.style.display = 'none';
        }
    });
    
    // 포맷 버튼들 (굵게, 기울임, 밑줄, 취소선, 하이라이트, 목록)
    formatButtons.forEach(btn => {
        if(btn.dataset.format) {
            btn.addEventListener('click', function() {
                const format = this.dataset.format;
                
                // 정렬 버튼이 아닌 경우만 토글
                if (!this.dataset.align) {
                    this.classList.toggle('active');
                }

                if (format === 'bold') {
                    toggleBold();
                } else if (format === 'italic') {
                    toggleItalic();
                } else if (format === 'underline') {
                    toggleUnderline();
                } else if (format === 'strikethrough') {
                    toggleStrikethrough();
                } else if (format === 'highlight') {
                    toggleHighlight();
                    this.classList.toggle('active');
                } else if (format === 'ul') {
                    insertList('ul');
                } else if (format === 'ol') {
                    insertList('ol');
                }
            });
        }
    });
    
    // 목록 삽입 함수
    function insertList(type) {
        const start = contentInput.selectionStart;
        const end = contentInput.selectionEnd;
        const text = contentInput.value;
        const selectedText = text.substring(start, end);
        
        if (selectedText) {
            const lines = selectedText.split('\n');
            let newText = '';
            
            lines.forEach((line, index) => {
                if (line.trim()) {
                    if (type === 'ul') {
                        newText += '• ' + line + '\n';
                    } else {
                        newText += (index + 1) + '. ' + line + '\n';
                    }
                } else {
                    newText += line + '\n';
                }
            });
            
            contentInput.value = text.substring(0, start) + newText + text.substring(end);
            contentInput.focus();
            contentInput.setSelectionRange(start, start + newText.length);
        } else {
            // 선택된 텍스트가 없으면 커서 위치에 목록 삽입
            const prefix = type === 'ul' ? '• ' : '1. ';
            const newText = text.substring(0, start) + prefix + text.substring(start);
            contentInput.value = newText;
            contentInput.focus();
            contentInput.setSelectionRange(start + prefix.length, start + prefix.length);
        }
        
        // 변경사항 저장
        if (state.selectedNode) {
            state.selectedNode.content = contentInput.value;
        }
    }

    // 정렬 버튼
    alignButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 다른 정렬 버튼의 active 상태 제거
            alignButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const alignment = this.dataset.align;
            contentInput.style.textAlign = alignment;
            contentInput.style.setProperty('text-align', alignment, 'important');
            
            // 현재 선택된 노드의 정렬 값 저장
            if (state.selectedNode) {
                state.selectedNode.textAlign = alignment;
            }
        });
    });
    
    // 초기 색상 인디케이터 설정
    updateTextColorIndicator(currentTextColor);
    updateBgColorIndicator(currentBgColor);
}

// 색상 밝기 계산 헬퍼 함수
function getBrightness(hexColor) {
    // '#RRGGBB' 형식에서 RGB 값 추출
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // 밝기 계산 (인지적 휘도 공식)
    return (r * 299 + g * 587 + b * 114) / 1000;
} 