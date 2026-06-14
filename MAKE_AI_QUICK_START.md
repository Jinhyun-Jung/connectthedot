# Make AI 빠른 시작 가이드 (5분 완성)

## 🚀 초간단 버전

### 1단계: 계정 만들기 (2분)
1. https://www.make.com 접속
2. "Sign up" 클릭
3. 이메일, 비밀번호 입력
4. 이메일 인증 완료

### 2단계: 시나리오 만들기 (3분)

#### ① 웹훅 추가
- "Create a new scenario" 클릭
- "Webhooks" 검색 → "Custom webhook" 선택
- "Add" 클릭
- 웹훅 URL 복사해두기! 📋

#### ② OpenAI 추가
- 웹훅 오른쪽 "+" 버튼 클릭
- "OpenAI" 검색 → 선택
- "Create a connection" → API 키 입력
- "Create a Chat Completion" 선택
- Model: `gpt-4o`
- Messages → "Add item"
  - Role: `user`
  - Content: `{{1.body.prompt}}`
- Temperature: `0.3`
- Max tokens: `2000`
- "OK" 클릭

#### ③ 응답 추가
- OpenAI 오른쪽 "+" 버튼 클릭
- "Webhooks" 검색 → "Respond to a webhook" 선택
- Response body (Raw):
```json
{
  "response": "{{2.choices[0].message.content}}"
}
```
- "OK" 클릭

#### ④ 저장 및 활성화
- 우측 상단 "Save" 클릭
- 하단 "OFF" → "ON"으로 변경

### 3단계: 코드에 URL 설정

`index.html` 파일의 `<head>` 섹션에서:

```html
<script>
    window.WEBHOOK_URL = '여기에_복사한_웹훅_URL_붙여넣기';
</script>
```

예시:
```html
<script>
    window.WEBHOOK_URL = 'https://hook.eu1.make.com/1234567890abcdef';
</script>
```

### 4단계: 테스트
1. 웹사이트 새로고침
2. AI 마인드맵 버튼 클릭
3. 텍스트 입력 후 생성
4. 작동 확인! ✅

---

## ❓ 자주 묻는 질문

**Q: 웹훅 URL을 어디서 찾나요?**
A: Make AI 시나리오에서 첫 번째 모듈(웹훅)을 클릭하면 URL이 표시됩니다.

**Q: OpenAI API 키는 어디서 받나요?**
A: https://platform.openai.com/api-keys 에서 발급받으세요.

**Q: 오류가 발생하면?**
A: Make AI 대시보드 → "Operations" 탭에서 오류 상세 정보를 확인하세요.

**Q: 무료 플랜으로 충분한가요?**
A: 테스트용으로는 충분합니다. 월 1,000회 호출 가능합니다.

---

## 📚 더 자세한 설명이 필요하면

`MAKE_AI_SETUP_GUIDE.md` 파일을 참고하세요!

