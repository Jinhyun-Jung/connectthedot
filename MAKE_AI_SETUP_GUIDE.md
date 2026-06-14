# Make AI 워크플로우 설정 가이드 (초보자용)

## 📋 목차
1. [Make AI 계정 생성](#1-make-ai-계정-생성)
2. [시나리오 생성](#2-시나리오-생성)
3. [웹훅 트리거 설정](#3-웹훅-트리거-설정)
4. [OpenAI 모듈 연결](#4-openai-모듈-연결)
5. [응답 모듈 설정](#5-응답-모듈-설정)
6. [시나리오 테스트](#6-시나리오-테스트)
7. [시나리오 활성화](#7-시나리오-활성화)
8. [웹훅 URL 설정](#8-웹훅-url-설정)

---

## 1. Make AI 계정 생성

### 단계별 가이드

1. **Make.com 접속**
   - 브라우저에서 https://www.make.com 접속
   - 우측 상단 "Sign up" 또는 "Get started for free" 클릭

2. **계정 생성**
   - 이메일 주소 입력
   - 비밀번호 설정
   - 이름 입력
   - 약관 동의 후 "Create account" 클릭

3. **이메일 인증**
   - 입력한 이메일로 인증 메일 확인
   - 메일의 링크 클릭하여 인증 완료

4. **플랜 선택**
   - 무료 플랜 선택 (Free Plan)
   - 월 1,000 operations 제공 (테스트용으로 충분)

---

## 2. 시나리오 생성

### 단계별 가이드

1. **대시보드 접속**
   - 로그인 후 메인 대시보드 화면 확인
   - 왼쪽 사이드바에 "Scenarios" 메뉴 확인

2. **새 시나리오 생성**
   - 화면 중앙 또는 상단의 **"Create a new scenario"** 버튼 클릭
   - 또는 왼쪽 사이드바에서 "Scenarios" → "+" 버튼 클릭

3. **시나리오 이름 설정**
   - 시나리오 편집 화면 상단에 이름 입력
   - 예: "AI Mindmap Generator" 또는 "ChatGPT Webhook"

---

## 3. 웹훅 트리거 설정

### 단계별 가이드

1. **트리거 모듈 추가**
   - 시나리오 편집 화면에서 첫 번째 모듈 선택
   - 검색창에 **"webhook"** 입력
   - **"Webhooks"** 앱 선택

2. **웹훅 타입 선택**
   - **"Custom webhook"** 선택 (첫 번째 옵션)
   - "Add" 또는 "Continue" 버튼 클릭

3. **웹훅 설정**
   - **Webhook name**: 원하는 이름 입력 (예: "AI Mindmap Webhook")
   - **Data structure**: "No" 선택 (간단하게 시작)
   - "Save" 버튼 클릭

4. **웹훅 URL 복사** ⚠️ 중요!
   - 모듈 설정 화면에 웹훅 URL이 표시됨
   - 예: `https://hook.eu1.make.com/xxxxxxxxxxxxx`
   - 이 URL을 복사해서 메모장에 저장해두세요!
   - 나중에 이 URL을 코드에 입력해야 합니다

---

## 4. OpenAI 모듈 연결

### 단계별 가이드

1. **모듈 추가**
   - 웹훅 모듈 오른쪽의 **"+"** 버튼 클릭
   - 또는 웹훅 모듈 아래 빈 공간 클릭

2. **OpenAI 앱 선택**
   - 검색창에 **"OpenAI"** 입력
   - **"OpenAI"** 앱 선택
   - "Add a module" 클릭

3. **OpenAI 연결 설정 (처음만)**
   - "Create a connection" 클릭
   - **Connection name**: 원하는 이름 입력 (예: "My OpenAI")
   - **API Key**: OpenAI API 키 입력
     - OpenAI API 키는 https://platform.openai.com/api-keys 에서 발급
     - "Create new secret key" 클릭하여 키 생성
     - ⚠️ 키는 한 번만 표시되므로 복사해서 안전하게 보관
   - "Save" 버튼 클릭

4. **OpenAI 모듈 설정**
   - **Module**: **"Create a Chat Completion"** 선택
   - **Model**: 드롭다운에서 **"gpt-4o"** 선택
     - 또는 "gpt-4o-mini" (더 저렴)
   
5. **Messages 설정** (중요!) 📍 위치 찾기
   
   **단계별 안내:**
   
   a. **모듈 설정 화면 스크롤**
      - OpenAI 모듈 설정 화면에서 아래로 스크롤
      - "Model" 필드 아래에 여러 설정 항목이 있음
   
   b. **Messages 섹션 찾기**
      - **"Messages"** 또는 **"Message"** 라는 제목의 섹션 찾기
      - 보통 "Model" 필드 바로 아래에 있음
      - 또는 "Parameters" 섹션 안에 있을 수 있음
   
   c. **Messages 배열 추가**
      - Messages 섹션에 **"Add item"** 또는 **"+"** 버튼이 있음
      - 이 버튼 클릭
   
   d. **Role 설정**
      - 새로 나타난 항목에서 **"Role"** 드롭다운 찾기
      - **"user"** 선택
   
   e. **Content 설정**
      - **"Content"** 필드 찾기 (Role 옆에 있음)
      - 아래 텍스트 입력:
        ```
        {{1.body.prompt}}
        ```
      - 또는 Content 필드 옆의 **작은 아이콘** (📎 또는 🔗) 클릭
      - 첫 번째 모듈(웹훅) 선택
      - `body` → `prompt` 선택
      - 자동으로 `{{1.body.prompt}}` 입력됨
   
   **💡 Messages가 보이지 않으면:**
   - "Show advanced settings" 또는 "More options" 클릭
   - 또는 "Parameters" 섹션 확장
   - Make AI 인터페이스가 업데이트되어 위치가 다를 수 있음

6. **추가 설정**
   - **Temperature**: `0.3` 입력 (일관된 결과를 위해)
   - **Max tokens**: `4000` 입력 ⚠️ 중요: 노드 본문 정보 포함으로 4000 권장
   - **Top P**: 비워두기 (기본값 사용)
   - **Frequency penalty**: 비워두기
   - **Presence penalty**: 비워두기

7. **저장**
   - "OK" 또는 "Save" 버튼 클릭

---

## 5. 응답 모듈 설정

### 단계별 가이드

1. **응답 모듈 추가**
   - OpenAI 모듈 오른쪽의 **"+"** 버튼 클릭
   - 검색창에 **"webhook"** 입력
   - **"Webhooks"** 앱 선택
   - **"Respond to a webhook"** 선택
   - "Add" 클릭

2. **응답 본문 설정**
   - **Response body** 섹션에서 "Raw" 탭 선택
   - 아래 JSON 코드 입력:
   ```json
   {
     "response": "{{2.choices[0].message.content}}"
   }
   ```
   - 설명:
     - `2`는 두 번째 모듈(OpenAI)
     - `choices[0].message.content`는 OpenAI 응답의 텍스트 부분
     - `response`는 우리가 반환할 필드명

3. **상태 코드 설정**
   - **Status**: `200` (기본값, 그대로 두기)

4. **저장**
   - "OK" 또는 "Save" 버튼 클릭

---

## 6. 시나리오 테스트

### 단계별 가이드

1. **시나리오 저장**
   - 우측 상단 **"Save"** 버튼 클릭
   - 시나리오가 저장됨

2. **테스트 실행**
   - 우측 상단 **"Run once"** 버튼 클릭
   - 또는 하단의 **"Run once"** 버튼 클릭

3. **웹훅 테스트 데이터 입력**
   - 첫 번째 모듈(웹훅)에서 "Click to select data" 클릭
   - 또는 "Add data manually" 클릭
   - **"Raw"** 탭 선택
   - 아래 JSON 입력:
   ```json
   {
     "prompt": "다음 텍스트를 분석하여 Mermaid.js graph TD 형식의 마인드맵으로 변환해주세요.\n\n**입력 텍스트:**\n인공지능의 역사\n\n**변환 규칙:**\n1. 노드는 A, B, C, D... 순서로 명명\n2. 화살표는 --> 사용\n3. 노드 텍스트는 [대괄호] 사용\n4. 계층 구조가 명확하게 드러나도록 연결\n5. 중심 주제는 A로 시작\n6. 상위 → 하위 관계를 화살표로 표현"
   }
   ```
   - "Save" 클릭
   
   **💡 참고**: 실제 앱에서는 이 형식으로 데이터가 전송됩니다:
   ```javascript
   {
     prompt: "Mermaid 변환 프롬프트...",
     model: "gpt-4o",
     temperature: 0.3,
     max_tokens: 4000
   }
   ```
   - Make AI에서는 `prompt` 필드만 사용하면 됩니다
   - Max tokens는 Make AI 시나리오의 OpenAI 모듈 설정을 사용합니다 (4000 권장)

4. **실행 확인**
   - 각 모듈이 순서대로 실행됨
   - 초록색 체크 표시가 나타나면 성공
   - 빨간색 X 표시가 나타나면 오류 확인

5. **결과 확인**
   - 세 번째 모듈(Respond to webhook) 클릭
   - "Response body"에서 응답 확인
   - `response` 필드에 Mermaid 코드가 있어야 함

---

## 7. 시나리오 활성화

### 단계별 가이드

1. **활성화 토글**
   - 시나리오 편집 화면 상단 또는 하단의 **"OFF"** 토글 찾기
   - 토글을 클릭하여 **"ON"**으로 변경

2. **확인**
   - 토글이 초록색으로 변경되고 "ON" 표시 확인
   - 이제 웹훅이 활성화되어 외부에서 호출 가능

---

## 8. 웹훅 URL 설정

### 방법 1: index.html에 직접 입력 (권장)

1. **웹훅 URL 복사**
   - Make AI 시나리오에서 첫 번째 모듈(웹훅) 클릭
   - 웹훅 URL 복사 (예: `https://hook.eu1.make.com/xxxxx`)

2. **index.html 수정**
   - 프로젝트의 `index.html` 파일 열기
   - `<head>` 섹션에서 주석 처리된 부분 찾기:
   ```html
   <!-- <script>
       window.WEBHOOK_URL = 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID';
   </script> -->
   ```
   
3. **주석 해제 및 URL 입력**
   ```html
   <script>
       window.WEBHOOK_URL = 'https://hook.eu1.make.com/YOUR_ACTUAL_WEBHOOK_ID';
   </script>
   ```
   - `YOUR_ACTUAL_WEBHOOK_ID`를 실제 웹훅 URL로 교체

### 방법 2: 브라우저 콘솔에서 설정

1. **웹사이트 접속**
   - 프로젝트 웹사이트 열기
   - F12 키를 눌러 개발자 도구 열기

2. **콘솔 탭 선택**
   - 개발자 도구에서 "Console" 탭 클릭

3. **명령어 입력**
   ```javascript
   localStorage.setItem('webhook_url', 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID');
   ```
   - `YOUR_WEBHOOK_ID`를 실제 웹훅 URL로 교체
   - Enter 키 누르기

4. **페이지 새로고침**
   - F5 키 또는 새로고침 버튼 클릭

---

## 🔍 문제 해결

### 문제 1: 웹훅이 응답하지 않음

**해결 방법:**
1. 시나리오가 "ON" 상태인지 확인
2. 웹훅 URL이 정확한지 확인
3. Make AI 대시보드에서 "Operations" 탭에서 실행 기록 확인
4. 오류 메시지 확인

### 문제 2: OpenAI 모듈에서 오류 발생

**해결 방법:**
1. API 키가 올바른지 확인
2. OpenAI 계정에 충분한 크레딧이 있는지 확인
3. 모델 이름이 정확한지 확인 (gpt-4o 또는 gpt-4o-mini)

### 문제 3: 응답 형식이 맞지 않음

**해결 방법:**
1. "Respond to webhook" 모듈의 Response body 확인
2. `{{2.choices[0].message.content}}` 형식이 정확한지 확인
3. 테스트 실행 후 각 모듈의 출력 데이터 확인

### 문제 4: CORS 오류

**해결 방법:**
- Make AI 웹훅은 기본적으로 CORS를 지원하므로 문제 없어야 함
- 만약 오류가 발생하면 Make AI 지원팀에 문의

---

## 📊 Make AI 무료 플랜 제한

- **월 1,000 operations**: 한 번의 웹훅 호출 = 1 operation
- **실행 시간 제한**: 모듈당 최대 2분
- **데이터 전송 제한**: 월 1GB

**참고:**
- 테스트용으로는 충분
- 프로덕션 사용 시 유료 플랜 고려

---

## 🎯 최종 확인 체크리스트

- [ ] Make AI 계정 생성 완료
- [ ] 시나리오 생성 완료
- [ ] 웹훅 트리거 설정 완료
- [ ] 웹훅 URL 복사 및 저장 완료
- [ ] OpenAI 모듈 연결 완료
- [ ] API 키 입력 완료
- [ ] Messages 설정 완료 (`{{1.body.prompt}}`)
- [ ] 응답 모듈 설정 완료
- [ ] 테스트 실행 성공
- [ ] 시나리오 활성화 완료
- [ ] 웹훅 URL을 코드에 설정 완료

---

## 💡 추가 팁

1. **웹훅 URL 보안**
   - 웹훅 URL은 공개되면 누구나 사용할 수 있음
   - 필요시 Make AI에서 웹훅에 인증 추가 가능

2. **로깅 확인**
   - Make AI 대시보드 → "Operations" 탭에서 모든 실행 기록 확인 가능
   - 오류 발생 시 여기서 상세 정보 확인

3. **모듈 데이터 확인**
   - 각 모듈을 클릭하면 입력/출력 데이터 확인 가능
   - 디버깅 시 유용

4. **응답 형식 커스터마이징**
   - 필요에 따라 Response body 형식 변경 가능
   - 예: 에러 처리, 추가 메타데이터 등

---

## 📞 도움이 필요하신가요?

- Make AI 공식 문서: https://www.make.com/en/help
- Make AI 커뮤니티: https://community.make.com/
- OpenAI API 문서: https://platform.openai.com/docs

