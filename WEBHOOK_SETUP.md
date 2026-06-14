# Make AI / n8n 웹훅 설정 가이드

## Make AI 설정 방법

### 1. Make AI 계정 생성
- https://www.make.com 접속
- 무료 계정 생성 (월 1,000 operations 제공)

### 2. 시나리오 생성
1. "Create a new scenario" 클릭
2. 트리거 선택: **Webhooks** → **Custom webhook**
3. "Add" 클릭하여 웹훅 생성
4. 웹훅 URL 복사 (예: `https://hook.eu1.make.com/xxxxx`)

### 3. OpenAI 모듈 추가
1. "+" 버튼 클릭하여 모듈 추가
2. **OpenAI** → **Create a Chat Completion** 선택
3. API 키 입력 (OpenAI API 키)
4. 설정:
   - Model: `gpt-4o`
   - Messages: `{{1.body.prompt}}` (웹훅에서 받은 prompt)
   - Temperature: `0.3`
   - Max tokens: `2000`

### 4. 웹훅 응답 설정
1. "+" 버튼으로 모듈 추가
2. **Webhooks** → **Respond to a webhook** 선택
3. Response body 설정:
```json
{
  "response": "{{2.choices[0].message.content}}"
}
```

### 5. 시나리오 활성화
- 시나리오를 "ON"으로 전환

## n8n 설정 방법

### 1. n8n 설치/접속
- 클라우드: https://n8n.io (무료 플랜 제공)
- 또는 자체 호스팅

### 2. 워크플로우 생성
1. "New workflow" 클릭
2. **Webhook** 노드 추가 (트리거)
3. 설정:
   - HTTP Method: `POST`
   - Path: `/chatgpt` (원하는 경로)
   - Response Mode: "Last Node"
4. 웹훅 URL 복사

### 3. OpenAI 노드 추가
1. "+" 버튼으로 노드 추가
2. **OpenAI** → **Chat** 선택
3. 설정:
   - Operation: `Create Chat Message`
   - Model: `gpt-4o`
   - Messages: 
     ```json
     [
       {
         "role": "user",
         "content": "{{ $json.body.prompt }}"
       }
     ]
     ```
   - Temperature: `0.3`
   - Max Tokens: `2000`

### 4. 응답 노드 설정
1. **Respond to Webhook** 노드 추가
2. Response Body:
```json
{
  "response": "{{ $json.choices[0].message.content }}"
}
```

### 5. 워크플로우 활성화
- "Active" 토글을 ON으로 설정

## 클라이언트 코드 설정

### 방법 1: 코드에 직접 입력
`js/ai-mermaid-converter.js` 파일에서:
```javascript
const webhookUrl = 'https://hook.eu1.make.com/YOUR_WEBHOOK_ID';
```

### 방법 2: localStorage 사용
브라우저 콘솔에서:
```javascript
localStorage.setItem('webhook_url', 'YOUR_WEBHOOK_URL');
```

### 방법 3: 환경 변수 (권장)
`index.html`에 추가:
```html
<script>
  window.WEBHOOK_URL = 'YOUR_WEBHOOK_URL';
</script>
```

## 테스트

1. 웹훅 URL이 올바르게 설정되었는지 확인
2. AI 마인드맵 생성 버튼 클릭
3. 브라우저 개발자 도구(F12) → Network 탭에서 요청 확인
4. 응답이 올바르게 오는지 확인

## 장점

✅ Firebase Functions 배포 문제 회피
✅ 무료 플랜으로도 사용 가능 (제한적)
✅ CORS 문제 없음
✅ 설정이 비교적 간단
✅ 시각적 워크플로우 관리

## 주의사항

⚠️ Make AI 무료 플랜: 월 1,000 operations
⚠️ n8n 클라우드 무료 플랜: 제한적
⚠️ API 키 보안: Make AI/n8n에서 안전하게 저장됨
⚠️ 응답 형식: 웹훅 응답 형식에 맞게 코드 조정 필요

