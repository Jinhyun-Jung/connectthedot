# Make AI에서 Messages 설정 찾기 (상세 가이드)

## 📍 Messages 설정 위치

### 방법 1: OpenAI 모듈 설정 화면에서

1. **OpenAI 모듈 클릭**
   - 시나리오 편집 화면에서 OpenAI 모듈(두 번째 모듈) 클릭
   - 모듈 설정 화면이 열림

2. **아래로 스크롤**
   - "Model" 필드를 설정한 후
   - 화면을 아래로 스크롤

3. **Messages 섹션 찾기**
   - **"Messages"** 또는 **"Message"** 라는 제목 찾기
   - 위치:
     - Model 필드 바로 아래
     - 또는 "Parameters" 섹션 안
     - 또는 "Advanced settings" 안

4. **Messages 배열 추가**
   - Messages 섹션에 **"Add item"** 또는 **"+"** 버튼 클릭
   - 새로운 항목이 추가됨

5. **Role과 Content 설정**
   - **Role**: 드롭다운에서 "user" 선택
   - **Content**: `{{1.body.prompt}}` 입력

---

## 🔍 Messages가 안 보일 때

### 해결 방법 1: Advanced Settings 확인
- "Show advanced settings" 또는 "More options" 버튼 클릭
- Messages가 숨겨져 있을 수 있음

### 해결 방법 2: Parameters 섹션 확인
- "Parameters" 또는 "Settings" 섹션 확장
- Messages가 그 안에 있을 수 있음

### 해결 방법 3: 다른 OpenAI 모듈 타입 확인
- Module에서 "Create a Chat Completion"이 맞는지 확인
- 다른 모듈 타입을 선택하면 Messages가 없을 수 있음

---

## 📸 화면 구성 예시

```
┌─────────────────────────────────┐
│ OpenAI 모듈 설정                │
├─────────────────────────────────┤
│ Module: [Create a Chat...]     │
│ Connection: [My OpenAI]         │
│                                 │
│ Model: [gpt-4o ▼]              │
│                                 │
│ ┌─ Messages ─────────────────┐ │
│ │ [Add item]                  │ │
│ │                             │ │
│ │ Item 1:                     │ │
│ │   Role: [user ▼]           │ │
│ │   Content: [{{1.body...}}] │ │
│ └─────────────────────────────┘ │
│                                 │
│ Temperature: [0.3]             │
│ Max tokens: [2000]             │
│                                 │
│ [OK] [Cancel]                  │
└─────────────────────────────────┘
```

---

## 💡 데이터 매핑 아이콘 사용법

### 방법 A: 직접 입력
1. Content 필드 클릭
2. 키보드로 입력: `{{1.body.prompt}}`

### 방법 B: 아이콘 사용 (추천)
1. Content 필드 오른쪽의 **작은 아이콘** 클릭
   - 📎 (클립) 아이콘
   - 또는 🔗 (링크) 아이콘
   - 또는 📋 (맵) 아이콘
2. 팝업 창에서:
   - 첫 번째 모듈(웹훅) 선택
   - `body` 확장
   - `prompt` 선택
3. 자동으로 `{{1.body.prompt}}` 입력됨

---

## ⚠️ 주의사항

1. **Messages는 배열입니다**
   - 여러 개의 메시지를 추가할 수 있음
   - 우리는 하나만 사용 (user 역할)

2. **Role 종류**
   - `user`: 사용자 메시지 (우리가 사용)
   - `system`: 시스템 프롬프트
   - `assistant`: AI 응답

3. **데이터 참조 형식**
   - `{{1.body.prompt}}` 형식이 정확해야 함
   - 숫자 `1`은 첫 번째 모듈(웹훅)
   - `body`는 요청 본문
   - `prompt`는 우리가 보낸 필드명

---

## 🆘 여전히 찾을 수 없으면

1. **Make AI 인터페이스 확인**
   - 최신 버전의 Make AI를 사용 중인지 확인
   - 브라우저 새로고침

2. **모듈 타입 확인**
   - "Create a Chat Completion"이 맞는지 확인
   - 다른 모듈 타입을 선택했을 수 있음

3. **스크린샷 공유**
   - OpenAI 모듈 설정 화면의 스크린샷을 보여주시면
   - 정확한 위치를 알려드릴 수 있습니다

4. **대안: Raw JSON 사용**
   - Messages 섹션이 복잡하면
   - "Raw" 또는 "JSON" 모드로 직접 입력 가능

---

## 📞 추가 도움

- Make AI 공식 문서: https://www.make.com/en/help/module/openai
- Make AI 커뮤니티: https://community.make.com/

