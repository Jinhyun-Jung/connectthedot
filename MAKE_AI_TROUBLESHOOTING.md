# Make AI 문제 해결 가이드

## ❌ "Accepted" 오류 해결

### 증상
```
SyntaxError: Unexpected token 'A', "Accepted" is not valid JSON
```

### 원인
Make AI의 "Respond to webhook" 모듈이 제대로 설정되지 않았습니다.

### 해결 방법

#### 1단계: "Respond to webhook" 모듈 확인
1. Make AI 시나리오에서 세 번째 모듈(응답 모듈) 클릭
2. "Respond to a webhook" 모듈인지 확인

#### 2단계: Response body 설정 확인
1. **"Response body"** 섹션 찾기
2. **"Raw"** 탭 선택 (중요!)
3. 아래 JSON이 정확히 입력되어 있는지 확인:
```json
{
  "response": "{{2.choices[0].message.content}}"
}
```

#### 3단계: 데이터 매핑 확인
1. Response body 필드 옆의 **작은 아이콘** (📎 또는 🔗) 클릭
2. 두 번째 모듈(OpenAI) 선택
3. `choices` → `0` → `message` → `content` 경로 확인
4. 자동으로 `{{2.choices[0].message.content}}` 입력되는지 확인

#### 4단계: 테스트 실행
1. 시나리오에서 "Run once" 클릭
2. 각 모듈이 성공적으로 실행되는지 확인
3. 세 번째 모듈(응답)에서 Response body 확인
4. `response` 필드에 실제 텍스트가 있는지 확인

---

## 🔍 다른 일반적인 오류

### 오류 1: "웹훅이 응답을 반환하지 않았습니다"

**원인:**
- "Respond to webhook" 모듈이 없음
- Response body가 비어있음
- 시나리오가 비활성화됨

**해결:**
1. 세 번째 모듈이 "Respond to webhook"인지 확인
2. Response body에 JSON 입력 확인
3. 시나리오가 "ON" 상태인지 확인

### 오류 2: "웹훅 서버에 연결할 수 없습니다"

**원인:**
- 웹훅 URL이 잘못됨
- 인터넷 연결 문제
- Make AI 서버 문제

**해결:**
1. 웹훅 URL이 정확한지 확인
2. Make AI 대시보드에서 시나리오 상태 확인
3. 브라우저 개발자 도구 → Network 탭에서 요청 확인

### 오류 3: "OpenAI API 오류"

**원인:**
- OpenAI API 키가 잘못됨
- API 크레딧 부족
- 모델 이름 오류

**해결:**
1. OpenAI 모듈에서 API 키 확인
2. https://platform.openai.com/account/usage 에서 크레딧 확인
3. 모델 이름이 "gpt-4o" 또는 "gpt-4o-mini"인지 확인

---

## ✅ 정상 작동 확인 방법

### 1. Make AI에서 테스트
1. 시나리오에서 "Run once" 클릭
2. 첫 번째 모듈(웹훅)에 테스트 데이터 입력:
```json
{
  "prompt": "테스트 프롬프트"
}
```
3. 각 모듈이 초록색 체크 표시로 성공하는지 확인
4. 세 번째 모듈(응답)에서 Response body 확인:
```json
{
  "response": "실제 AI 응답 텍스트..."
}
```

### 2. 브라우저에서 확인
1. 개발자 도구(F12) → Console 탭 열기
2. AI 마인드맵 생성 시도
3. 다음 로그 확인:
   - `🤖 웹훅을 통해 AI 호출...`
   - `📡 웹훅 응답 상태: 200 OK`
   - `📡 응답 본문 (원본): {...}`
   - `✅ JSON 파싱 성공: ...`
   - `✅ 응답 형식: data.response`

### 3. Network 탭에서 확인
1. 개발자 도구 → Network 탭
2. AI 마인드맵 생성 시도
3. 웹훅 URL로 요청 확인
4. 응답(Response) 탭에서 JSON 확인:
```json
{
  "response": "Mermaid 코드..."
}
```

---

## 🛠️ Make AI 시나리오 체크리스트

- [ ] 웹훅 모듈이 첫 번째로 설정됨
- [ ] 웹훅 URL이 복사되어 코드에 입력됨
- [ ] OpenAI 모듈이 두 번째로 설정됨
- [ ] OpenAI API 키가 올바르게 입력됨
- [ ] Messages에 `{{1.body.prompt}}` 설정됨
- [ ] Model이 "gpt-4o"로 설정됨
- [ ] "Respond to webhook" 모듈이 세 번째로 설정됨
- [ ] Response body에 `{"response": "{{2.choices[0].message.content}}"}` 설정됨
- [ ] Response body가 "Raw" 탭에서 JSON 형식으로 입력됨
- [ ] 시나리오가 "ON" 상태임
- [ ] "Run once" 테스트가 성공함

---

## 📞 추가 도움

문제가 계속되면:
1. Make AI 대시보드 → "Operations" 탭에서 오류 상세 확인
2. 각 모듈을 클릭하여 입력/출력 데이터 확인
3. Make AI 커뮤니티: https://community.make.com/

