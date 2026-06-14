# Make AI Messages 설정 완벽 가이드

## 🎯 문제: 프롬프트가 ChatGPT에 전달되지 않음

### 증상
- Mermaid 코드가 생성되지 않음
- "생성된 Mermaid 코드가 유효하지 않습니다" 오류
- ChatGPT가 프롬프트를 받지 못함

---

## ✅ 해결 방법: Messages 설정

### 1단계: OpenAI 모듈 열기
1. Make AI 시나리오에서 **두 번째 모듈(OpenAI)** 클릭
2. 모듈 설정 화면이 열림

### 2단계: Messages 섹션 찾기
1. **Model** 필드 설정 후
2. 화면을 **아래로 스크롤**
3. **"Messages"** 또는 **"Message"** 섹션 찾기
   - Model 필드 바로 아래
   - 또는 "Parameters" 섹션 안
   - 또는 "Advanced settings" 안

### 3단계: Messages 항목 추가
1. Messages 섹션에서 **"Add item"** 또는 **"+"** 버튼 클릭
2. 새로운 항목이 나타남

### 4단계: Role 설정
1. **"Role"** 드롭다운 찾기
2. **"user"** 선택

### 5단계: Content 설정 (⚠️ 가장 중요!)

**방법 A: 직접 입력 (추천)**
1. **"Content"** 필드 클릭
2. 아래 텍스트를 **정확히** 입력:
   ```
   {{1.body.prompt}}
   ```
   - `1` = 첫 번째 모듈(웹훅)
   - `body` = 요청 본문
   - `prompt` = 우리가 보낸 필드명

**방법 B: 데이터 매핑 아이콘 사용**
1. Content 필드 오른쪽의 **작은 아이콘** 클릭
   - 📎 (클립) 아이콘
   - 또는 🔗 (링크) 아이콘
   - 또는 📋 (맵) 아이콘
2. 팝업 창에서:
   - **첫 번째 모듈(웹훅)** 선택
   - `body` 확장 클릭
   - `prompt` 선택
3. 자동으로 `{{1.body.prompt}}` 입력됨

---

## 🔍 모듈 번호가 다른 경우

### OpenAI 모듈이 6번째라면:
```
{{6.body.prompt}}
```
또는 데이터 매핑에서 6번째 모듈 선택

### 확인 방법:
1. 시나리오 편집 화면에서 모듈 순서 확인
2. 왼쪽부터 1, 2, 3... 순서
3. OpenAI 모듈이 몇 번째인지 확인

---

## 📋 최종 Messages 설정 예시

### 올바른 설정:
```
Role: user
Content: {{1.body.prompt}}
```

### 또는 (OpenAI가 6번째인 경우):
```
Role: user
Content: {{6.body.prompt}}
```

---

## ✅ 설정 확인 방법

### 1. 테스트 실행
1. 시나리오에서 **"Run once"** 클릭
2. 첫 번째 모듈(웹훅)에 테스트 데이터 입력:
   ```json
   {
     "prompt": "테스트 프롬프트입니다"
   }
   ```

### 2. OpenAI 모듈 확인
1. 두 번째 모듈(OpenAI) 클릭
2. 출력 데이터 확인
3. `choices[0].message.content`에 응답이 있는지 확인
4. 응답이 비어있으면 Messages 설정이 잘못됨

### 3. 콘솔 로그 확인
브라우저 개발자 도구(F12) → Console 탭:
- `📤 웹훅으로 전송하는 데이터:` 로그 확인
- `prompt` 필드에 프롬프트가 있는지 확인

---

## 🚨 자주 하는 실수

### 실수 1: Content 필드가 비어있음
- Messages에 항목을 추가했지만 Content를 입력하지 않음
- **해결:** Content에 `{{1.body.prompt}}` 입력

### 실수 2: 잘못된 모듈 번호
- `{{2.body.prompt}}` 사용했지만 웹훅이 1번째
- **해결:** 올바른 모듈 번호 사용

### 실수 3: 필드명 오타
- `prompt` 대신 `message` 또는 다른 이름 사용
- **해결:** 코드에서 보내는 필드명과 일치해야 함

### 실수 4: Messages 항목을 추가하지 않음
- Messages 섹션에 아무것도 없음
- **해결:** "Add item" 클릭하여 항목 추가

---

## 💡 디버깅 팁

### 1. 각 모듈의 데이터 확인
1. "Run once" 실행 후
2. 각 모듈 클릭
3. 입력/출력 데이터 확인
4. 첫 번째 모듈(웹훅)에서 `body.prompt` 확인
5. 두 번째 모듈(OpenAI)에서 Messages 확인

### 2. 브라우저 콘솔 확인
- `📤 웹훅으로 전송하는 데이터:` 로그에서
- `prompt` 필드에 실제 프롬프트가 있는지 확인
- 프롬프트가 "Mermaid.js graph TD 형식..."으로 시작하는지 확인

### 3. Make AI Operations 확인
1. Make AI 대시보드 → "Operations" 탭
2. 최근 실행 기록 확인
3. 각 모듈의 입력/출력 데이터 확인
4. 오류 메시지 확인

---

## 📝 체크리스트

- [ ] OpenAI 모듈에서 Messages 섹션 찾음
- [ ] Messages에 항목 추가함 ("Add item" 클릭)
- [ ] Role을 "user"로 설정함
- [ ] Content에 `{{1.body.prompt}}` 입력함 (또는 올바른 모듈 번호)
- [ ] "Run once" 테스트 실행
- [ ] OpenAI 모듈에서 응답이 생성되는지 확인
- [ ] 응답에 Mermaid 코드가 포함되어 있는지 확인

---

## 🎯 최종 확인

설정이 올바르다면:
1. "Run once" 실행 시
2. OpenAI 모듈에서 응답 생성됨
3. 응답에 Mermaid 코드 포함됨
4. 세 번째 모듈(응답)에서 JSON 형식으로 반환됨

문제가 계속되면:
- Make AI Operations 탭에서 오류 확인
- 각 모듈의 입력/출력 데이터 확인
- 브라우저 콘솔의 로그 확인

