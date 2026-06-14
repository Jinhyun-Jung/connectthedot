# Make AI "Respond to webhook" 모듈 설정 (최신 버전)

## 📍 모듈 번호 확인 방법

### 1단계: 시나리오에서 모듈 순서 확인
Make AI 시나리오 편집 화면에서:
- 첫 번째 모듈: 웹훅 (Custom webhook)
- 두 번째 모듈: OpenAI
- 세 번째 모듈: Respond to webhook

**⚠️ 중요:** 모듈 번호는 시나리오에서의 순서입니다!
- `{{1}}` = 첫 번째 모듈 (웹훅)
- `{{2}}` = 두 번째 모듈 (OpenAI)
- `{{3}}` = 세 번째 모듈 (응답)

### 2단계: OpenAI 모듈 번호 확인
1. OpenAI 모듈 클릭
2. 모듈 설정 화면 상단에 모듈 번호 표시됨
3. 또는 시나리오에서 왼쪽에서 오른쪽으로 순서대로 번호 매김

---

## 🔧 "Respond to webhook" 모듈 설정 (Body 필드 사용)

### 최신 Make AI 인터페이스

1. **"Respond to webhook" 모듈 클릭**
   - 세 번째 모듈(또는 마지막 모듈) 클릭

2. **Body 필드 찾기**
   - "Raw" 탭이 없으면 "Body" 필드 사용
   - "Body" 또는 "Response body" 필드 찾기

3. **Body 필드에 JSON 입력**
   
   **방법 A: 직접 입력 (추천)**
   - Body 필드에 아래 JSON을 직접 입력:
   ```json
   {
     "response": "{{2.choices[0].message.content}}"
   }
   ```
   
   **방법 B: 데이터 매핑 사용**
   - Body 필드 옆의 작은 아이콘 클릭
   - 두 번째 모듈(OpenAI) 선택
   - `choices` → `0` → `message` → `content` 선택
   - 자동으로 `{{2.choices[0].message.content}}` 입력됨

4. **모듈 번호가 다를 경우**
   - OpenAI 모듈이 6번째라면:
   ```json
   {
     "response": "{{6.choices[0].message.content}}"
   }
   ```
   - 또는 `{{6.raw_result}}`를 사용 중이라면:
   ```json
   {
     "response": "{{6.raw_result}}"
   }
   ```
   - 하지만 `raw_result`는 전체 응답 객체이므로, 아래 형식 사용:
   ```json
   {
     "response": "{{6.choices[0].message.content}}"
   }
   ```

---

## 🔍 모듈 번호 확인 방법

### 방법 1: 모듈 클릭 시 확인
1. OpenAI 모듈 클릭
2. 모듈 설정 화면 상단에 번호 표시
3. 예: "Module 2: OpenAI" 또는 "2. OpenAI"

### 방법 2: 시나리오에서 순서 확인
- 시나리오 편집 화면에서 왼쪽부터 순서대로:
  - 1번: 웹훅
  - 2번: OpenAI
  - 3번: Respond to webhook

### 방법 3: 데이터 매핑으로 확인
1. "Respond to webhook" 모듈의 Body 필드
2. 작은 아이콘 클릭
3. 사용 가능한 모듈 목록에서 OpenAI 모듈 찾기
4. 모듈 이름 옆에 번호 표시됨

---

## ✅ 올바른 설정 예시

### 시나리오 구조가 다음과 같다면:
```
[1. Custom webhook] → [2. OpenAI] → [3. Respond to webhook]
```

### Body 필드 설정:
```json
{
  "response": "{{2.choices[0].message.content}}"
}
```

### 시나리오 구조가 다음과 같다면:
```
[1. Custom webhook] → [2. 다른 모듈] → ... → [6. OpenAI] → [7. Respond to webhook]
```

### Body 필드 설정:
```json
{
  "response": "{{6.choices[0].message.content}}"
}
```

---

## 🛠️ 문제 해결

### 문제 1: `{{2}}`를 인식하지 못함

**해결 방법:**
1. OpenAI 모듈이 실제로 몇 번째인지 확인
2. 올바른 번호 사용 (예: `{{6}}`)

### 문제 2: "Raw" 탭이 없음

**해결 방법:**
- "Body" 필드에 직접 JSON 입력
- Make AI 최신 버전에서는 "Body" 필드가 JSON을 자동 인식

### 문제 3: `{{6.raw_result}}` 사용 중

**설명:**
- `raw_result`는 OpenAI의 전체 응답 객체
- 우리는 텍스트만 필요하므로 `choices[0].message.content` 사용

**올바른 형식:**
```json
{
  "response": "{{6.choices[0].message.content}}"
}
```

---

## 📝 최종 체크리스트

- [ ] OpenAI 모듈이 몇 번째인지 확인 (예: 2번 또는 6번)
- [ ] "Respond to webhook" 모듈의 Body 필드 찾기
- [ ] Body 필드에 아래 JSON 입력:
  ```json
  {
    "response": "{{X.choices[0].message.content}}"
  }
  ```
  (X는 OpenAI 모듈 번호)
- [ ] "Run once" 테스트 실행
- [ ] 세 번째 모듈(응답)에서 Response body 확인
- [ ] `response` 필드에 실제 텍스트가 있는지 확인

---

## 💡 팁

1. **데이터 매핑 아이콘 사용**
   - Body 필드 옆의 작은 아이콘 클릭
   - OpenAI 모듈 선택
   - `choices` → `0` → `message` → `content` 경로 선택
   - 자동으로 올바른 형식 입력됨

2. **테스트 실행으로 확인**
   - "Run once" 실행 후
   - 각 모듈의 출력 데이터 확인
   - OpenAI 모듈에서 `choices[0].message.content` 경로 확인

3. **모듈 재정렬**
   - 필요시 모듈을 드래그하여 순서 변경
   - 더 간단한 구조로 만들기

