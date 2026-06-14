// 캔버스 드래그 초기화
function initCanvasDrag() {
    const canvas = document.getElementById('canvas');
    const body = document.body;
    
    // 캔버스 상태 초기화
    canvasState.isDragging = false;
    canvasState.isZooming = false;
    canvasState.lastX = 0;
    canvasState.lastY = 0;
    canvasState.lastDistance = 0;
    canvasState.lastNodeScale = 1 / canvasState.scale; // 노드 스케일 초기화

    // 기존 이벤트 리스너 제거 후 다시 추가
    // 전체 문서에 휴 이벤트 리스너 추가
    document.removeEventListener('wheel', handleWheel);
    document.addEventListener('wheel', handleWheel, { passive: false });

    // 터치 이벤트 리스너 추가
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // 마우스 이벤트 리스너 추가
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 노드가 사라지는 문제 해결을 위해 즉시 렌더링
    render();
    
    // 캔버스 영역에 마우스 오버 시 커서 변경
    canvas.addEventListener('mouseenter', () => {
        body.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        body.style.cursor = 'default';
    });
}

// 터치 이벤트 핸들러
function handleTouchStart(e) {
    e.preventDefault();
    
    // UI 요소 터치 무시
    if (e.target.closest('.node, #editor, .calendar-container, .folder-container, .auth-button, .show-folder-btn, .show-calendar-btn, #addButton, #spreadsheetButton')) {
        return;
    }

    // 두 손가락 터치 (핀치 줌)
    if (e.touches.length === 2) {
        canvasState.isZooming = true;
        canvasState.isDragging = false;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        canvasState.lastDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
    } 
    // 한 손가락 터치 (드래그)
    else if (e.touches.length === 1) {
        canvasState.isZooming = false;
        canvasState.isDragging = true;
        canvasState.lastX = e.touches[0].clientX;
        canvasState.lastY = e.touches[0].clientY;
    }
}

function handleTouchMove(e) {
    e.preventDefault();

    // 핀치 줄 처리
    if (e.touches.length === 2 && canvasState.isZooming) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        if (canvasState.lastDistance) {
            const delta = currentDistance - canvasState.lastDistance;
            const scaleFactor = 1 + (delta * 0.005); // 확대/축소 속도 조절
            
            // 핀치 중심점 계산
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;

            // 이전 스케일 저장
            const oldScale = canvasState.scale;
            
            // 새로운 스케일 계산 (최소/최대 제한 적용)
            canvasState.scale = Math.min(Math.max(
                canvasState.scale * scaleFactor,
                canvasState.minScale
            ), canvasState.maxScale);

            // 스케일 변화에 따른 위치 조정
            const scaleChange = canvasState.scale - oldScale;
            canvasState.translateX -= (centerX - canvasState.translateX) * (scaleChange / oldScale);
            canvasState.translateY -= (centerY - canvasState.translateY) * (scaleChange / oldScale);
            
            // 스케일이 변경되었을 때는 즉시 적용
            requestAnimationFrame(() => {
                applyTransform();
            });
        }
        
        canvasState.lastDistance = currentDistance;
    }
    // 드래그 처리
    else if (e.touches.length === 1 && canvasState.isDragging) {
        const touch = e.touches[0];
        const dx = touch.clientX - canvasState.lastX;
        const dy = touch.clientY - canvasState.lastY;

        canvasState.translateX += dx;
        canvasState.translateY += dy;

        canvasState.lastX = touch.clientX;
        canvasState.lastY = touch.clientY;
        
        // 캔버스 이동만 적용 - 노드 크기 변경 없음
        const canvas = document.getElementById('canvas');
        canvas.style.transform = `translate(${canvasState.translateX}px, ${canvasState.translateY}px) scale(${canvasState.scale})`;
    }
}

function handleTouchEnd(e) {
    // 모든 터치가 끝났을 때
    if (e.touches.length === 0) {
        canvasState.isDragging = false;
        canvasState.isZooming = false;
        canvasState.lastDistance = 0;
    }
    // 한 손가락이 남아있는 경우
    else if (e.touches.length === 1) {
        canvasState.isZooming = false;
        canvasState.isDragging = true;
        canvasState.lastX = e.touches[0].clientX;
        canvasState.lastY = e.touches[0].clientY;
    }
}

// 마우스 이벤트 핸들러
function handleMouseDown(e) {
    if (e.target.closest('.node, #editor, .calendar-container, .folder-container, .auth-button, .show-folder-btn, .show-calendar-btn, #addButton, #spreadsheetButton')) {
        return;
    }
    
    canvasState.isDragging = true;
    canvasState.lastX = e.clientX;
    canvasState.lastY = e.clientY;
    document.body.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
    if (!canvasState.isDragging) {
        if (e.target.closest('.node, #editor, .calendar-container, .folder-container, .auth-button, .show-folder-btn, .show-calendar-btn, #addButton, #spreadsheetButton')) {
            document.body.style.cursor = 'default';
        } else {
            document.body.style.cursor = 'grab';
        }
        return;
    }
    
    const dx = e.clientX - canvasState.lastX;
    const dy = e.clientY - canvasState.lastY;

    canvasState.translateX += dx;
    canvasState.translateY += dy;

    canvasState.lastX = e.clientX;
    canvasState.lastY = e.clientY;

    // 캔버스 이동만 직접 적용 - 노드 크기 변경 없이 성능 최적화
    const canvas = document.getElementById('canvas');
    canvas.style.transform = `translate(${canvasState.translateX}px, ${canvasState.translateY}px) scale(${canvasState.scale})`;

    // 드래그 중에는 마우스 커서 스타일 변경
    document.body.style.cursor = 'grabbing';
    canvas.style.cursor = 'grabbing';
}

function handleMouseUp() {
    if (canvasState.isDragging) {
        canvasState.isDragging = false;
        document.body.style.cursor = 'grab';
    }
}

// 휴 이벤트 핸들러
function handleWheel(e) {
    // UI 요소 위에서는 기본 스크롤이 동작하도록 그대로 둠
    if (e.target.closest('#editor, .calendar-container, .folder-container, .auth-button, .show-folder-btn, .show-calendar-btn, #addButton, #spreadsheetButton')) {
        return;
    }

    e.preventDefault();

    // 애니메이션이 진행 중이면 무시
    if (canvasState.isAnimating) {
        return;
    }
    
    const delta = e.deltaY;
    // 확대/축소 속도 조절 - 휴 반응성 증가
    let scaleSpeed = 0.15; // 0.05에서 0.15로 증가하여 휴 반응성 증가
    
    // 휴 회전 정도에 따라 반응성 조절
    const wheelSensitivity = Math.abs(delta) > 100 ? 1.5 : 1.0; // 휴을 빠르게 돌리면 더 크게 변화
    scaleSpeed *= wheelSensitivity;
    
    // 현재 스케일에 따른 조절
    if (canvasState.scale > canvasState.maxScale * 0.8) {
        scaleSpeed *= 0.7; // 최대 확대에 가까울 때 더 작은 변화량 적용
    } else if (canvasState.scale < canvasState.minScale * 1.5) {
        scaleSpeed *= 0.7; // 최소 축소에 가까울 때도 더 작은 변화량 적용
    }
    
    const currentScale = canvasState.scale;

    // 새로운 스케일 계산 - 가득한 변화 방지
    let newScale;
    if (delta > 0) {
        // 축소 - 최소값 제한 적용
        newScale = Math.max(currentScale / (1 + scaleSpeed), canvasState.minScale);
    } else {
        // 확대 - 최대값 제한 적용
        newScale = Math.min(currentScale * (1 + scaleSpeed), canvasState.maxScale);
    }
    
    // 스케일 변화가 너무 큰 경우 제한 (최대 확대에서 축소할 때 문제 방지)
    const maxScaleChange = 0.5; // 최대 스케일 변화량 증가 (0.2 -> 0.5)
    
    // 휴 회전 속도에 따라 최대 변화량 조절
    const adjustedMaxChange = Math.abs(delta) > 100 ? maxScaleChange : maxScaleChange * 0.7;
    
    if (Math.abs(newScale - currentScale) > adjustedMaxChange) {
        if (newScale < currentScale) {
            // 축소할 때
            newScale = currentScale - adjustedMaxChange;
        } else {
            // 확대할 때
            newScale = currentScale + adjustedMaxChange;
        }
    }

    // 스케일이 변경되었을 때만 업데이트
    if (newScale !== currentScale) {
        // 스케일 변화만 적용하고 위치 변화는 최소화
        // 중앙 중심으로 확대/축소하도록 조정
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // 확대/축소 전의 중앙 위치
        const beforeX = (centerX - canvasState.translateX) / currentScale;
        const beforeY = (centerY - canvasState.translateY) / currentScale;

        // 확대/축소 후의 중앙 위치
        const afterX = beforeX * newScale;
        const afterY = beforeY * newScale;

        // 위치 보정 계산 - 중앙 중심으로 확대/축소
        const targetTranslateX = canvasState.translateX + (beforeX - afterX);
        const targetTranslateY = canvasState.translateY + (beforeY - afterY);
        
        // 애니메이션 상태 저장
        canvasState.isAnimating = true;
        
        // 스케일 변화 전에 노드를 보이게 설정
        document.querySelectorAll('.node').forEach(nodeElement => {
            nodeElement.style.visibility = 'visible';
            nodeElement.style.opacity = '1';
        });
        
        // 부드러운 확대/축소 애니메이션 구현
        animateZoom(currentScale, newScale, canvasState.translateX, canvasState.translateY, targetTranslateX, targetTranslateY);
    }
}

// 부드러운 확대/축소 애니메이션 함수
function animateZoom(startScale, endScale, startX, startY, endX, endY) {
    // 스케일 변화에 따라 애니메이션 시간 조절
    const scaleDifference = Math.abs(endScale - startScale);
    // 변화가 클수록 애니메이션 시간 증가, 최소 150ms, 최대 250ms
    const duration = Math.min(Math.max(scaleDifference * 400, 150), 250);
    const startTime = Date.now();
    
    // 노드가 보이지 않는 문제 방지
    document.querySelectorAll('.node').forEach(nodeElement => {
        nodeElement.style.visibility = 'visible';
        nodeElement.style.opacity = '1';
    });
    
    // 위치 변화량 축소 - 너무 많이 움직이는 문제 해결
    const moveReductionFactor = 0.3; // 위치 변화량을 더 줄임 (0.5 -> 0.3)
    
    // 중앙 기준으로 조정하기 위한 계산
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // 위치 변화 최소화
    const adjustedEndX = startX + (endX - startX) * moveReductionFactor;
    const adjustedEndY = startY + (endY - startY) * moveReductionFactor;
    
    function animate() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 애니메이션 이징 함수 (ease-out) - 더 부드러운 이징 적용
        const easeProgress = 1 - Math.pow(1 - progress, 4); // 3제곱 -> 4제곱으로 변경
        
        // 현재 애니메이션 진행 상태의 값 계산
        const currentAnimScale = startScale + (endScale - startScale) * easeProgress;
        
        // 위치 변화량을 줄인 값 사용
        const currentAnimX = startX + (adjustedEndX - startX) * easeProgress;
        const currentAnimY = startY + (adjustedEndY - startY) * easeProgress;
        
        // 값 적용
        canvasState.scale = currentAnimScale;
        canvasState.translateX = currentAnimX;
        canvasState.translateY = currentAnimY;
        
        // 변환 적용
        applyTransform();
        render();
        
        // 애니메이션 진행 여부 확인
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // 애니메이션 완료
            canvasState.isAnimating = false;
            
            // 한 번 더 렌더링하여 노드가 보이는지 확인
            setTimeout(() => {
                render();
            }, 50);
        }
    }
    
    // 애니메이션 시작
    requestAnimationFrame(animate);
}

// 캔버스 변환 적용 함수
function applyTransform() {
    // 캔버스 변환 적용
    const canvas = document.getElementById('canvas');
    canvas.style.transform = `translate(${canvasState.translateX}px, ${canvasState.translateY}px) scale(${canvasState.scale})`;
    canvas.style.transformOrigin = '0 0';

    // 노드 스케일 조정 불필요 - 캔버스 transform으로 이미 스케일됨
    // 노드에 추가 scale을 적용하면 2번 스케일되어 라인과 불일치 발생

    // 스케일이 변경되었을 때만 노드 업데이트
    if (!canvasState.lastNodeScale || Math.abs(canvasState.lastNodeScale - canvasState.scale) > 0.01) {
        // 노드들의 기본 transform 유지 (scale 제거)
        document.querySelectorAll('.node').forEach(nodeElement => {
            nodeElement.style.transform = `translate(-50%, -50%)`;
            
            // 노드가 보이지 않는 문제 방지를 위해 가시성 확인
            nodeElement.style.visibility = 'visible';
            nodeElement.style.opacity = '1';
            
            // 날짜 요소의 스케일도 보정
            const dateElement = nodeElement.querySelector('.node-date-external');
            if (dateElement) {
                const counterScale = 1 / canvasState.scale;
                // 매우 강력한 스타일 재적용
                dateElement.style.cssText = `
                    position: absolute !important;
                    top: calc(100% + 20px) !important;
                    left: 50% !important;
                    transform: translateX(-50%) scale(${counterScale}) !important;
                    font-size: ${16 * counterScale}px !important;
                    color: #000000 !important;
                    background: rgba(255, 255, 255, 0.98) !important;
                    border: 3px solid #000000 !important;
                    border-radius: 15px !important;
                    padding: 10px 18px !important;
                    font-weight: 900 !important;
                    font-family: 'Noto Sans KR', Arial, sans-serif !important;
                    text-align: center !important;
                    white-space: nowrap !important;
                    pointer-events: none !important;
                    z-index: 999999 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    box-shadow: 
                        0 6px 16px rgba(0, 0, 0, 0.4),
                        0 3px 6px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
                    letter-spacing: 1px !important;
                    text-shadow: none !important;
                    min-width: 80px !important;
                    min-height: 24px !important;
                    line-height: 1.2 !important;
                    transform-origin: center !important;
                    will-change: transform !important;
                `;
                
                console.log('날짜 요소 스케일 보정 적용:', {
                    canvasScale: canvasState.scale,
                    counterScale: counterScale,
                    dateElement: !!dateElement,
                    dateText: dateElement.textContent
                });
            }
        });
        
        // 마지막 적용된 스케일 갱신
        canvasState.lastNodeScale = canvasState.scale;
    }
} 