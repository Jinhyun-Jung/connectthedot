# Make AI Prompt Type 설정 수정

## 🔴 문제 발견!

현재 설정:
- **Prompt Type**: "File prompt" (선택됨) ❌

이것이 문제입니다! "File prompt"는 파일을 업로드하는 방식이고, 우리는 텍스트를 보내고 있습니다.

---

## ✅ 해결 방법

### 1단계: Prompt Type 변경

1. **OpenAI 모듈(두 번째) 클릭**
2. **"Prompt Type" 또는 "Input Type" 필드 찾기**
   - 현재 "File prompt"로 선택되어 있음
3. **드롭다운 클릭**
4. **"Text prompt" 선택** ✅
   - 첫 번째 옵션: "Text prompt"
5. **저장**

### 2단계: Messages 설정 확인

Prompt Type을 "Text prompt"로 변경하면:
- Messages 섹션이 나타나거나
- Content 필드를 입력할 수 있게 됨

1. **Messages 섹션 확인**
2. **Content 필드에 입력:**
   ```
   {{1.body.prompt}}
   ```

---

## 📋 Prompt Type 종류

### Text prompt (우리가 사용) ✅
- 텍스트를 직접 입력하는 방식
- Messages의 Content 필드에 텍스트 입력
- 우리의 경우: `{{1.body.prompt}}`

### File prompt ❌
- 파일을 업로드하는 방식
- 우리는 사용하지 않음

### Image prompt ❌
- 이미지를 업로드하는 방식
- 우리는 사용하지 않음

### Reusable prompt ❌
- 재사용 가능한 프롬프트 템플릿
- 우리는 사용하지 않음

### Advanced input ❌
- 고급 입력 옵션
- 우리는 사용하지 않음

---

## ✅ 올바른 설정

### OpenAI 모듈 설정:
1. **Module**: "Create a Chat Completion"
2. **Model**: "gpt-4o"
3. **Prompt Type**: **"Text prompt"** ← 중요!
4. **Messages**:
   - Role: "user"
   - Content: `{{1.body.prompt}}`
5. **Temperature**: 0.3
6. **Max tokens**: 2000

---

## 🔍 확인 방법

### 1. "Run once" 테스트
1. 시나리오에서 "Run once" 클릭
2. 두 번째 모듈(OpenAI) 클릭
3. **Input 확인:**
   ```
   Prompt Type: Text prompt ← 확인!
   Prompt
     Role: user
     Content: {{1.body.prompt}} 또는 실제 프롬프트 ← 확인!
   ```
4. **Output 확인:**
   ```
   Result: (실제 AI 응답이 있어야 함)
   ```

### 2. 브라우저 테스트
1. 웹사이트에서 AI 마인드맵 생성 시도
2. 개발자 도구(F12) → Console 확인
3. 응답이 정상적으로 오는지 확인

---

## 💡 왜 "File prompt"가 문제인가?

- "File prompt"는 파일 업로드를 기대함
- 우리는 텍스트(`prompt` 필드)를 보냄
- Make AI가 파일을 찾지 못해서 Content가 비어짐
- 결과: "You haven't asked anything yet."

"Text prompt"로 변경하면:
- 텍스트 입력을 기대함
- `{{1.body.prompt}}`가 정상적으로 매핑됨
- 프롬프트가 ChatGPT에 전달됨
- 정상적인 응답 생성

---

## 🎯 최종 체크리스트

- [ ] Prompt Type이 **"Text prompt"**로 설정됨
- [ ] Messages 섹션에 항목이 있음
- [ ] Role이 "user"로 설정됨
- [ ] Content에 `{{1.body.prompt}}` 입력됨
- [ ] "Run once" 테스트 실행
- [ ] Input에서 Content가 비어있지 않음
- [ ] Output에서 Result에 실제 응답이 있음

이제 정상 작동할 것입니다!

