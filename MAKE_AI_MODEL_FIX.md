# Make AI 모델 설정 수정

## 🔴 문제 발견!

현재 설정:
- **Model**: "gpt 5.1 (system)" ❌

이것이 문제입니다!
- "gpt-5.1"은 존재하지 않는 모델입니다
- "(system)" 표시는 시스템 프롬프트 모듈일 수 있습니다
- 올바른 모델은 "gpt-4o" 또는 "gpt-4o-mini"입니다

---

## ✅ 해결 방법

### 1단계: 모델 변경

1. **OpenAI 모듈(두 번째) 클릭**
2. **"Model" 필드 찾기**
   - 현재 "gpt 5.1 (system)"으로 설정되어 있음
3. **드롭다운 클릭**
4. **올바른 모델 선택:**
   - **"gpt-4o"** (추천) ✅
   - 또는 "gpt-4o-mini" (더 저렴)
5. **저장**

### 2단계: 모듈 타입 확인

"(system)" 표시가 있다면 모듈 타입이 다를 수 있습니다.

1. **Module 필드 확인**
   - "Create a Chat Completion"인지 확인
   - 다른 타입이면 변경 필요

2. **올바른 모듈 타입:**
   - Module: **"Create a Chat Completion"** ✅
   - 이것이 ChatGPT API를 호출하는 모듈입니다

---

## 📋 올바른 OpenAI 모델 목록

### 사용 가능한 모델:
- **gpt-4o** ✅ (추천 - 최신, 강력함)
- **gpt-4o-mini** ✅ (더 저렴, 빠름)
- **gpt-4-turbo**
- **gpt-4**
- **gpt-3.5-turbo**

### 존재하지 않는 모델:
- ❌ gpt-5.1
- ❌ gpt-5
- ❌ gpt-6

---

## ✅ 올바른 전체 설정

### OpenAI 모듈 설정:
1. **Module**: "Create a Chat Completion"
2. **Model**: **"gpt-4o"** ← 중요!
3. **Prompt Type**: "Text prompt"
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
   Model: gpt-4o ← 확인!
   Prompt Type: Text prompt
   Prompt
     Role: user
     Content: {{1.body.prompt}} 또는 실제 프롬프트
   ```
4. **Output 확인:**
   ```
   Result: (실제 AI 응답이 있어야 함)
   ```

### 2. 오류 확인
- 모델이 존재하지 않으면 오류 발생
- "Model not found" 같은 오류 메시지 확인

---

## 💡 "(system)" 표시가 있는 경우

### 가능한 원인:
1. **모듈 타입이 다름**
   - "Create a Chat Completion"이 아닐 수 있음
   - 다른 OpenAI 모듈 타입 사용 중일 수 있음

2. **해결 방법:**
   - Module 필드에서 "Create a Chat Completion" 선택
   - 또는 모듈을 삭제하고 다시 추가

---

## 🎯 최종 체크리스트

- [ ] Module이 "Create a Chat Completion"인지 확인
- [ ] Model이 **"gpt-4o"** 또는 **"gpt-4o-mini"**로 설정됨
- [ ] Prompt Type이 "Text prompt"로 설정됨
- [ ] Messages의 Content에 `{{1.body.prompt}}` 입력됨
- [ ] "Run once" 테스트 실행
- [ ] 오류 없이 실행됨
- [ ] Output에 실제 응답이 생성됨

---

## 🚨 모델을 찾을 수 없다면

1. **Make AI 업데이트 확인**
   - 최신 버전의 Make AI 사용 중인지 확인
   - 브라우저 새로고침

2. **OpenAI 연결 확인**
   - OpenAI API 키가 올바른지 확인
   - 연결을 삭제하고 다시 생성

3. **모듈 재생성**
   - OpenAI 모듈 삭제
   - 새로 추가
   - 처음부터 설정

---

모델을 "gpt-4o"로 변경하면 정상 작동할 것입니다!

