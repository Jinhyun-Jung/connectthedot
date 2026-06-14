# Make AI Content 필드가 비어있는 문제 해결

## 🔴 문제 상황

두 번째 모듈(OpenAI)의 Input에서:
```
Prompt
  Role: user
  Content: (비어있음) ← 문제!
```

결과: "You haven't asked anything yet."

---

## ✅ 해결 방법

### 방법 1: Messages Content 필드에 직접 입력

1. **OpenAI 모듈(두 번째) 클릭**
2. **Messages 섹션 찾기**
   - Model 필드 아래로 스크롤
   - "Messages" 또는 "Message" 섹션
3. **Messages 항목 확인**
   - 이미 항목이 있다면 클릭하여 편집
   - 없다면 "Add item" 클릭
4. **Content 필드 확인**
   - Content 필드가 비어있는지 확인
   - 비어있다면 아래 입력:
   ```
   {{1.body.prompt}}
   ```
5. **저장**
   - "OK" 또는 "Save" 클릭

---

### 방법 2: 데이터 매핑 아이콘 사용 (추천)

1. **OpenAI 모듈(두 번째) 클릭**
2. **Messages 섹션 → Content 필드 찾기**
3. **Content 필드 옆의 작은 아이콘 클릭**
   - 📎 (클립) 아이콘
   - 또는 🔗 (링크) 아이콘
   - 또는 📋 (맵) 아이콘
4. **데이터 매핑 창에서:**
   - 첫 번째 모듈(웹훅) 선택
   - `body` 확장
   - `prompt` 선택
5. **자동 입력 확인**
   - `{{1.body.prompt}}`가 자동으로 입력되는지 확인
6. **저장**

---

### 방법 3: OpenAI 모듈 타입 확인

현재 모듈이 "Create a Chat Completion"이 아닐 수 있습니다.

1. **OpenAI 모듈 클릭**
2. **Module 필드 확인**
   - "Create a Chat Completion"인지 확인
   - 다른 모듈 타입이면 변경 필요
3. **Module 변경:**
   - Module 드롭다운 클릭
   - "Create a Chat Completion" 선택
4. **Messages 다시 설정**
   - 위의 방법 1 또는 2로 Content 설정

---

## 🔍 현재 설정 확인

### 첫 번째 모듈(웹훅) - ✅ 정상
```
prompt: (Long String) - 프롬프트가 있음
model: gpt-4o
temperature: 0.3
max_tokens: 2000
```

### 두 번째 모듈(OpenAI) - ❌ 문제
```
Prompt
  Role: user
  Content: (비어있음) ← 여기가 문제!
```

### 세 번째 모듈(응답) - ❌ 결과
```
Body: {"response": ""} ← 빈 응답
```

---

## 📝 수정 후 확인

### 1. "Run once" 테스트
1. 시나리오에서 "Run once" 클릭
2. 첫 번째 모듈에 테스트 데이터 입력 (이미 있으면 그대로 사용)
3. 두 번째 모듈(OpenAI) 클릭
4. **Input 확인:**
   ```
   Prompt
     Role: user
     Content: {{1.body.prompt}} 또는 실제 프롬프트 텍스트 ← 이제 있어야 함!
   ```
5. **Output 확인:**
   ```
   Result: (실제 AI 응답이 있어야 함)
   ```

### 2. 브라우저 콘솔 확인
F12 → Console 탭:
- `📤 웹훅으로 전송하는 데이터:` 로그에서 `prompt` 확인
- `📡 웹훅 응답 상태:` 확인
- `📡 응답 본문 (원본):` 확인

---

## 🎯 최종 체크리스트

- [ ] OpenAI 모듈의 Module이 "Create a Chat Completion"인지 확인
- [ ] Messages 섹션에 항목이 있는지 확인
- [ ] Role이 "user"로 설정되어 있는지 확인
- [ ] **Content 필드에 `{{1.body.prompt}}`가 입력되어 있는지 확인** ⚠️ 가장 중요!
- [ ] "Run once" 테스트 실행
- [ ] 두 번째 모듈의 Input에서 Content가 비어있지 않은지 확인
- [ ] 두 번째 모듈의 Output에서 Result에 실제 응답이 있는지 확인

---

## 💡 추가 팁

### Content 필드가 여전히 비어있다면:

1. **다른 필드명 확인**
   - 코드에서 `prompt`로 보내고 있음
   - Make AI에서 `prompt` 필드를 찾을 수 있는지 확인

2. **전체 경로 확인**
   - `{{1.body.prompt}}` 대신
   - `{{1.prompt}}` 시도
   - 또는 데이터 매핑으로 정확한 경로 확인

3. **모듈 재생성**
   - OpenAI 모듈 삭제 후 다시 추가
   - 처음부터 설정

---

## 🚨 응급 조치

Content 필드를 찾을 수 없다면:

1. **OpenAI 모듈 설정에서 "Show advanced settings" 클릭**
2. **또는 "Parameters" 섹션 확장**
3. **Messages가 다른 이름으로 있을 수 있음**
   - "User message"
   - "Input"
   - "Text"
   - 등등

4. **Make AI 최신 인터페이스 확인**
   - 인터페이스가 변경되었을 수 있음
   - 공식 문서 참고

