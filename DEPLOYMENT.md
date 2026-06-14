# Firebase Functions 배포 가이드

AI 마인드맵 생성 기능을 위한 Firebase Cloud Functions 배포 및 설정 가이드입니다.

## 📋 사전 요구사항

1. **Firebase 프로젝트**
   - Firebase Console에서 프로젝트 생성 완료
   - 프로젝트 ID: `connect-the-dot-48ec7`

2. **필수 도구 설치**
   ```bash
   # Node.js 18 이상 설치 확인
   node --version

   # Firebase CLI 설치
   npm install -g firebase-tools
   ```

3. **OpenAI API 키**
   - OpenAI 계정 생성 및 API 키 발급
   - https://platform.openai.com/api-keys

## 🚀 배포 단계

### 1단계: Firebase 로그인
```bash
# Firebase CLI 로그인
firebase login

# 로그인 확인
firebase projects:list
```

### 2단계: Functions 의존성 설치
```bash
# functions 디렉토리로 이동
cd functions

# package.json 의존성 설치
npm install

# 설치 확인
npm list
```

예상 출력:
```
functions@1.0.0
├── cors@2.8.5
├── firebase-admin@12.0.0
├── firebase-functions@4.5.0
└── node-fetch@2.7.0
```

### 3단계: OpenAI API 키 설정
```bash
# Firebase Functions 환경 변수 설정
firebase functions:config:set openai.key="YOUR_OPENAI_API_KEY"

# 설정 확인
firebase functions:config:get
```

예상 출력:
```json
{
  "openai": {
    "key": "sk-proj-..."
  }
}
```

**⚠️ 중요**: API 키는 절대 Git에 커밋하지 마세요!

### 4단계: Firestore 규칙 설정 (선택)
```bash
# Firestore 보안 규칙 배포
firebase deploy --only firestore:rules
```

`firestore.rules` 파일 확인:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // usage 컬렉션: 사용자 본인만 읽기 가능
    match /usage/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId.split('_')[0];
      allow write: if false; // Functions에서만 쓰기 가능
    }

    // nodes 컬렉션 등 기존 규칙...
  }
}
```

### 5단계: Functions 배포
```bash
# Functions만 배포
firebase deploy --only functions

# 또는 전체 배포 (hosting + functions)
firebase deploy
```

배포 중 출력:
```
=== Deploying to 'connect-the-dot-48ec7'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: packaged functions (node_modules: 25 files)
i  functions: creating Node.js 18 function generateMindmap(us-central1)...
✔  functions[generateMindmap(us-central1)]: Successful create operation.

✔  Deploy complete!

Functions URL (generateMindmap):
https://us-central1-connect-the-dot-48ec7.cloudfunctions.net/generateMindmap
```

### 6단계: 배포 확인
```bash
# Functions 목록 확인
firebase functions:list

# 로그 확인
firebase functions:log
```

## 🧪 테스트

### 1. 수동 API 테스트 (curl)
```bash
# 1. Firebase 인증 토큰 가져오기 (브라우저 개발자 도구에서)
# 로그인 후 콘솔에서 실행:
# firebase.auth().currentUser.getIdToken().then(console.log)

# 2. cURL 테스트
curl -X POST \
  https://us-central1-connect-the-dot-48ec7.cloudfunctions.net/generateMindmap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "프로젝트 관리 시스템의 주요 기능을 Mermaid 다이어그램으로 만들어주세요."
      }
    ],
    "temperature": 0.3,
    "max_tokens": 2000
  }'
```

### 2. 웹 애플리케이션에서 테스트
1. 배포된 웹사이트 접속
2. Firebase 로그인
3. 🤖 AI 버튼 클릭
4. 텍스트 입력 또는 파일 업로드
5. "생성하기" 버튼 클릭
6. 새 캔버스 탭에 마인드맵 생성 확인

### 3. 사용량 제한 테스트
```bash
# checkUsage 함수 호출
curl -X GET \
  https://us-central1-connect-the-dot-48ec7.cloudfunctions.net/checkUsage \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

예상 응답:
```json
{
  "used": 3,
  "remaining": 47,
  "limit": 50,
  "reset_at": "2025-11-15T23:59:59Z"
}
```

## 🔧 문제 해결

### 오류 1: "Firebase CLI not found"
```bash
# Firebase CLI 재설치
npm install -g firebase-tools

# 또는 npx 사용
npx firebase-tools login
```

### 오류 2: "OpenAI API key not set"
```bash
# 환경 변수 확인
firebase functions:config:get

# 재설정
firebase functions:config:set openai.key="YOUR_API_KEY"

# Functions 재배포
firebase deploy --only functions
```

### 오류 3: "CORS error"
- Functions의 `cors` 미들웨어가 제대로 작동하는지 확인
- `functions/index.js`의 `cors({ origin: true })` 설정 확인

### 오류 4: "Authentication required"
```bash
# Firebase Authentication 활성화 확인
# Firebase Console → Authentication → Sign-in method → Email/Password 활성화
```

### 오류 5: "Daily limit exceeded"
- Firestore Console에서 `usage` 컬렉션 확인
- 필요시 수동으로 카운트 리셋 또는 한도 조정

## 📊 모니터링

### 1. Firebase Console
```
Firebase Console → Functions → 대시보드
- 호출 횟수
- 실행 시간
- 오류율
- 활성 인스턴스
```

### 2. 로그 확인
```bash
# 실시간 로그
firebase functions:log --only generateMindmap

# 최근 로그 (라인 수 지정)
firebase functions:log --only generateMindmap --lines 50
```

### 3. Firestore 사용량 확인
```javascript
// Firebase Console → Firestore → usage 컬렉션
// 문서 ID 형식: {userId}_{YYYY-MM-DD}
// 필드: count (사용 횟수), lastUsed (마지막 사용 시각)
```

## 💰 비용 관리

### Firebase Functions 무료 한도
- **호출 횟수**: 월 2백만 회
- **컴퓨팅 시간**: 월 400,000 GB-초
- **네트워크 송신**: 월 5GB

### OpenAI API 비용
- **GPT-4o**: 입력 $5/1M 토큰, 출력 $15/1M 토큰
- **예상 비용**: 요청당 약 1000 토큰 → $0.005~0.02/요청
- **일일 50회 제한** → 사용자당 최대 $1/일

### 비용 절감 팁
1. **사용량 제한**: `DAILY_LIMIT` 값 조정 (functions/index.js:59)
2. **토큰 최적화**: `max_tokens` 값 낮추기 (현재 2000)
3. **모델 변경**: gpt-4o → gpt-3.5-turbo (저렴)
4. **캐싱**: 동일 요청 결과 Firestore에 저장

## 🔄 업데이트

### Functions 코드 수정 후
```bash
# 1. 코드 수정
# functions/index.js 편집

# 2. 재배포
firebase deploy --only functions

# 3. 배포 확인
firebase functions:list
```

### 환경 변수 변경
```bash
# API 키 업데이트
firebase functions:config:set openai.key="NEW_API_KEY"

# 재배포 필요
firebase deploy --only functions
```

## 📚 추가 리소스

- [Firebase Functions 문서](https://firebase.google.com/docs/functions)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase 가격 정책](https://firebase.google.com/pricing)

## ✅ 체크리스트

배포 전 확인사항:
- [ ] Firebase 프로젝트 생성 완료
- [ ] Firebase CLI 설치 및 로그인
- [ ] `functions/` 디렉토리에서 `npm install` 실행
- [ ] OpenAI API 키 환경 변수 설정
- [ ] Firestore 보안 규칙 설정
- [ ] Functions 배포 완료
- [ ] 배포된 URL 테스트
- [ ] 웹 애플리케이션에서 기능 테스트
- [ ] 사용량 제한 동작 확인
- [ ] 로그 모니터링 설정

배포 완료! 🎉
