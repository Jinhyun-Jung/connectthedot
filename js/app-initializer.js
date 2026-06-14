// 색상 버튼 이벤트 처리
function initColorButtons() {
    const colorButtons = document.querySelectorAll('.emotion-color-btn');
    const titleInput = document.getElementById('titleInput');

    colorButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const color = this.dataset.color;

            if (this.classList.contains('active')) {
                // 이미 활성화된 버튼을 다시 클릭한 경우
                colorButtons.forEach(b => b.classList.remove('active'));
                if (state.selectedNode) {
                    state.selectedNode.emotion = 'default';
                }
            } else {
                // 새로운 색상 선택
                colorButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                if (state.selectedNode) {
                    state.selectedNode.emotion = color;
                }
            }

            // 제목 입력창 항상 검은색으로 유지
            titleInput.style.color = '#000000';
        });
    });
}

// 초기화 함수 (Firebase v11+ 업데이트)
async function initialize() {
    try {
        // 캘린더와 폴더뷰 버튼 초기화
        const showFolderBtn = document.querySelector('.show-folder-btn');
        const showCalendarBtn = document.querySelector('.show-calendar-btn');
        const folderContainer = document.querySelector('.folder-container');
        const calendarContainer = document.querySelector('.calendar-container');

        // 초기 상태 설정
        if (showFolderBtn) showFolderBtn.style.display = 'block';
        if (showCalendarBtn) showCalendarBtn.style.display = 'block';

        // 저장된 상태 복원
        const isFolderHidden = localStorage.getItem('folderViewHidden') === 'true';
        const isCalendarHidden = localStorage.getItem('calendarViewHidden') === 'true';

        if (folderContainer) {
            if (isFolderHidden) {
                folderContainer.classList.add('hidden');
            } else {
                folderContainer.classList.remove('hidden');
            }
        }

        if (calendarContainer) {
            if (isCalendarHidden) {
                calendarContainer.classList.add('hidden');
            } else {
                calendarContainer.classList.remove('hidden');
            }
        }

        // 이벤트 핸들러들 초기화
        if (typeof EventHandlers !== 'undefined' && EventHandlers.init) {
            EventHandlers.init();
        } else {
            console.warn('EventHandlers가 로드되지 않았습니다.');
        }
        
        if (typeof initCanvasDrag === 'function') {
            initCanvasDrag();
        } else {
            console.warn('initCanvasDrag 함수가 정의되지 않았습니다.');
        }
        
        if (typeof initPanelSystem === 'function') {
            initPanelSystem();
        } else {
            console.warn('initPanelSystem 함수가 정의되지 않았습니다.');
        }
        
        if (typeof StarryBackground !== 'undefined' && StarryBackground.init) {
            StarryBackground.init();
        } else {
            console.warn('StarryBackground가 로드되지 않았습니다.');
        }
        
        // UI 컨트롤러에서 서식 도구 초기화
        if (typeof initFormattingTools === 'function') {
            initFormattingTools();
        }
        
        initColorButtons();
        
        // 물리 효과 활성화
        if (typeof state !== 'undefined') {
            state.floatingEnabled = true;
            if (typeof updateFloating === 'function') {
                updateFloating();
            }
        }
        
        // 캔버스 탭 매니저 초기화
        if (typeof CanvasTabManager !== 'undefined') {
            window.canvasTabManager = new CanvasTabManager();
        }
        
        // Firebase 관련 초기화는 firebase-manager.js에서 자동으로 처리됩니다.
        console.log('앱 초기화 완료 (Firebase는 firebase-manager.js에서 처리됨)');
        
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }
}

// 윈도우 리사이즈 이벤트 - 별 재생성 추가
window.addEventListener('resize', () => {
    if (typeof StarryBackground !== 'undefined' && StarryBackground.init) {
        StarryBackground.init();
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initialize);

// ===== AI 마인드맵 관련 함수들 =====

/**
 * AI 마인드맵 모달 열기
 */
function openAIModal() {
    const modal = document.getElementById('aiModal');
    if (modal) {
        modal.classList.add('active');

        // 텍스트 입력창 포커스
        const textInput = document.getElementById('aiTextInput');
        if (textInput) {
            setTimeout(() => textInput.focus(), 100);
        }
    }
}

/**
 * AI 마인드맵 모달 닫기
 */
function closeAIModal() {
    const modal = document.getElementById('aiModal');
    if (modal) {
        modal.classList.remove('active');

        // 텍스트 입력 완전 초기화
        const textInput = document.getElementById('aiTextInput');
        if (textInput) {
            textInput.value = '';
            textInput.textContent = '';
            // 포커스 해제
            textInput.blur();
        }

        // 파일 입력 초기화
        const fileInput = document.getElementById('aiFileInput');
        if (fileInput) {
            fileInput.value = '';
        }

        // 옵션 체크박스 초기화 (기본값으로)
        const autoLinkCheckbox = document.getElementById('aiAutoLink');
        const smartLayoutCheckbox = document.getElementById('aiSmartLayout');
        if (autoLinkCheckbox) autoLinkCheckbox.checked = true;
        if (smartLayoutCheckbox) smartLayoutCheckbox.checked = true;

        hideAIProgress();
    }
}

/**
 * AI 진행 상황 표시
 */
function showAIProgress(message = 'AI가 분석하고 있습니다...') {
    const progress = document.getElementById('aiProgress');
    const progressText = document.querySelector('.ai-progress-text');
    const generateBtn = document.getElementById('aiGenerateBtn');

    if (progress) {
        progress.classList.add('active');
    }
    if (progressText) {
        progressText.textContent = message;
    }
    if (generateBtn) {
        generateBtn.disabled = true;
    }
}

/**
 * AI 진행 상황 숨기기
 */
function hideAIProgress() {
    const progress = document.getElementById('aiProgress');
    const generateBtn = document.getElementById('aiGenerateBtn');

    if (progress) {
        progress.classList.remove('active');
    }
    if (generateBtn) {
        generateBtn.disabled = false;
    }
}

/**
 * AI 마인드맵 생성 메인 함수
 */
async function generateAIMindmap() {
    const textInput = document.getElementById('aiTextInput');
    const text = textInput ? textInput.value.trim() : '';

    // 입력 검증
    if (!text) {
        alert('분석할 텍스트를 입력해주세요.');
        return;
    }

    try {
        // 진행 상황 표시
        showAIProgress('AI가 텍스트를 분석하고 있습니다...');

        // AI 마인드맵 생성
        await AIMindmapGenerator.generateFromText(text, (message) => {
            showAIProgress(message);
        });

        // 성공
        hideAIProgress();
        closeAIModal();

        // 성공 메시지
        alert('✅ AI 마인드맵이 생성되었습니다!');

    } catch (error) {
        console.error('❌ AI 마인드맵 생성 실패:', error);
        hideAIProgress();
        alert('오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 파일 업로드 처리 (한글 인코딩 지원)
 * UTF-8, EUC-KR, CP949 등 여러 인코딩 자동 감지
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const textInput = document.getElementById('aiTextInput');
    if (!textInput) return;

    // 인코딩별로 시도할 순서
    const encodings = ['UTF-8', 'EUC-KR'];
    
    // 먼저 ArrayBuffer로 읽기
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const buffer = e.target.result;
        const uint8Array = new Uint8Array(buffer);
        
        // BOM 확인 (UTF-8 BOM: EF BB BF)
        let startIndex = 0;
        let detectedEncoding = 'UTF-8';
        
        if (uint8Array.length >= 3 && 
            uint8Array[0] === 0xEF && 
            uint8Array[1] === 0xBB && 
            uint8Array[2] === 0xBF) {
            // UTF-8 BOM 있음
            startIndex = 3;
            detectedEncoding = 'UTF-8';
        }
        
        // UTF-8로 먼저 시도
        try {
            const decoder = new TextDecoder('UTF-8', { fatal: true });
            const content = decoder.decode(buffer.slice(startIndex));
            
            // 깨진 문자 확인 (U+FFFD는 TextDecoder가 잘못된 바이트를 만났을 때 사용)
            // 내용이 있고, 깨진 문자가 없으면 성공
            if (content && content.length > 0 && !content.includes('\uFFFD')) {
                textInput.value = content;
                console.log('✅ UTF-8 인코딩으로 파일 읽기 성공');
                return;
            }
        } catch (err) {
            console.log('UTF-8 디코딩 실패, EUC-KR 시도:', err);
        }
        
        // UTF-8 실패 시 EUC-KR로 시도
        // ArrayBuffer를 바이너리 문자열로 변환
        let binaryString = '';
        for (let i = startIndex; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        
        // EUC-KR을 UTF-8로 변환 시도
        try {
            // escape/decodeURIComponent 방법으로 EUC-KR -> UTF-8 변환
            const utf8Content = decodeURIComponent(escape(binaryString));
            
            // 변환 결과에 깨진 문자가 없는지 확인
            if (utf8Content && utf8Content.length > 0 && !utf8Content.includes('\uFFFD')) {
                textInput.value = utf8Content;
                console.log('✅ EUC-KR 인코딩으로 파일 읽기 성공');
                return;
            }
        } catch (err) {
            console.warn('EUC-KR 변환 실패:', err);
        }
        
        // 모든 변환 실패 시 원본 표시 및 경고
        console.warn('⚠️ 인코딩 자동 감지 실패, 원본 데이터 표시');
        textInput.value = binaryString;
        alert('파일 인코딩을 자동으로 감지할 수 없습니다.\n파일이 UTF-8 또는 EUC-KR 인코딩인지 확인해주세요.');
    };
    
    reader.onerror = function() {
        // ArrayBuffer 읽기 실패 시 일반 텍스트로 읽기 시도
        console.log('ArrayBuffer 읽기 실패, 일반 텍스트로 시도');
        
        // 여러 인코딩으로 순차 시도
        let encodingIndex = 0;
        
        function tryNextEncoding() {
            if (encodingIndex >= encodings.length) {
                alert('파일을 읽는 중 오류가 발생했습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다.');
                return;
            }
            
            const encoding = encodings[encodingIndex];
            const reader2 = new FileReader();
            
            reader2.onload = function(e) {
                const content = e.target.result;
                
                // 깨진 문자 확인 (U+FFFD)
                if (content && content.length > 0 && !content.includes('\uFFFD')) {
                    textInput.value = content;
                    console.log(`✅ ${encoding} 인코딩으로 파일 읽기 성공`);
                } else {
                    // 다음 인코딩 시도
                    encodingIndex++;
                    tryNextEncoding();
                }
            };
            
            reader2.onerror = function() {
                // 다음 인코딩 시도
                encodingIndex++;
                tryNextEncoding();
            };
            
            reader2.readAsText(file, encoding);
        }
        
        tryNextEncoding();
    };
    
    reader.readAsArrayBuffer(file);
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    // AI 버튼 클릭 이벤트
    const aiButton = document.getElementById('aiMindmapButton');
    if (aiButton) {
        aiButton.addEventListener('click', openAIModal);
    }

    // 파일 업로드 이벤트
    const fileInput = document.getElementById('aiFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // 클립보드 붙여넣기 이벤트 처리
    const textInput = document.getElementById('aiTextInput');
    if (textInput) {
        // paste 이벤트 핸들러 추가
        textInput.addEventListener('paste', function(e) {
            // 기본 동작 허용 (브라우저가 클립보드 내용을 textarea에 붙여넣음)
            // 추가로 클립보드 데이터 확인 및 처리
            const clipboardData = e.clipboardData || window.clipboardData;
            if (clipboardData) {
                const pastedText = clipboardData.getData('text/plain');
                if (pastedText) {
                    // 클립보드에 텍스트가 있는 경우, 기본 동작을 허용하되
                    // 필요시 추가 처리 가능
                    console.log('붙여넣기 감지:', pastedText.length, '자');
                } else {
                    // 클립보드에 텍스트가 없는 경우 경고
                    console.warn('클립보드에 텍스트 데이터가 없습니다.');
                }
            }
        });
        
        // Ctrl+V 키보드 이벤트도 처리
        textInput.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                // Ctrl+V 또는 Cmd+V 감지
                // 기본 동작을 허용하되, 클립보드 확인
                setTimeout(function() {
                    if (textInput.value.length === 0) {
                        // 붙여넣기가 실패한 경우 수동으로 클립보드 읽기 시도
                        if (navigator.clipboard && navigator.clipboard.readText) {
                            navigator.clipboard.readText().then(function(text) {
                                if (text) {
                                    textInput.value = text;
                                    console.log('클립보드에서 텍스트 복원:', text.length, '자');
                                }
                            }).catch(function(err) {
                                console.warn('클립보드 읽기 실패:', err);
                            });
                        }
                    }
                }, 10);
            }
        });
    }

    // 모달 바깥 클릭 시 닫기
    const modal = document.getElementById('aiModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeAIModal();
            }
        });
    }

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('aiModal');
            if (modal && modal.classList.contains('active')) {
                closeAIModal();
            }
        }
    });
});
