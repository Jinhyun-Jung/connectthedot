# Connect the Dot - AI 마인드맵 생성기

웹 기반 마인드맵 애플리케이션 + AI 자동 마인드맵 생성

## 🚀 빠른 시작

### 1. 필수 설치
```bash
# Python 패키지 설치
pip install -r requirements.txt
```

### 2. API 키 설정
`.env` 파일에 OpenAI API 키가 이미 설정되어 있습니다.

```env
OPENAI_API_KEY=sk-proj-...
PROXY_PORT=3001
```

### 3. 서버 실행

**터미널 1: API 프록시 서버**
```bash
python api_proxy.py
```

출력 예시:
```
==================================================
🚀 OpenAI API 프록시 서버 시작
==================================================
📡 포트: 3001
🔑 API 키 설정됨: ✅
🌐 주소: http://localhost:3001
==================================================
```

**터미널 2: 웹 서버**
```bash
python -m http.server 8000
```

### 4. 브라우저 접속
```
http://localhost:8000
```

## 🤖 AI 마인드맵 사용법

### 1단계: 로그인
- 게스트로 시작하기 또는 이메일 로그인

### 2단계: AI 마인드맵 생성
1. 우측 🤖 버튼 클릭
2. 텍스트 입력 또는 `.txt`, `.md` 파일 업로드
3. "🚀 AI로 마인드맵 생성하기" 클릭

### 예시 텍스트
```
프로젝트 관리 시스템
- 사용자 관리
  - 회원가입/로그인
  - 권한 설정
- 작업 관리
  - 할 일 생성
  - 진행 상황 추적
- 협업 기능
  - 댓글
  - 파일 공유
```

### 결과
- 새 캔버스 탭 자동 생성
- 계층적 노드 배치
- 화살표로 연결된 관계 표시
- 깊이별 색상 구분

## 📁 프로젝트 구조

```
.
├── .env                        # API 키 설정 (보안)
├── .gitignore                  # Git 제외 파일
├── api_proxy.py               # OpenAI API 프록시 서버
├── requirements.txt           # Python 패키지
├── index.html                 # 메인 HTML
├── css/
│   ├── ai-mindmap.css        # AI 모달 스타일
│   └── ...
└── js/
    ├── mermaid-parser.js      # Mermaid 파서
    ├── ai-mermaid-converter.js # AI 변환기
    ├── ai-mindmap-generator.js # 마인드맵 생성기
    └── ...
```

## 🔐 보안

- ✅ API 키는 `.env` 파일에만 저장
- ✅ `.gitignore`에 `.env` 포함 (Git에 업로드 안 됨)
- ✅ 프록시 서버를 통한 API 호출 (브라우저에 노출 안 됨)
- ✅ CORS 문제 해결

## 🛠️ 문제 해결

### "프록시 서버에 연결할 수 없습니다"
```bash
# 프록시 서버가 실행 중인지 확인
python api_proxy.py
```

### "API 키가 설정되지 않았습니다"
`.env` 파일 확인:
```bash
cat .env
```

### 포트 충돌
`.env` 파일에서 포트 변경:
```env
PROXY_PORT=3002
```

## 📚 기술 스택

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Python Flask (프록시 서버)
- **AI**: OpenAI GPT-4o
- **Database**: Firebase Firestore
- **Diagram**: Mermaid.js (중간 포맷)

## 🎯 주요 기능

### 기본 기능
- 노드 생성 및 편집
- 드래그 앤 드롭
- 링크 연결
- 폴더 구조
- 캘린더 통합
- 다중 캔버스

### AI 기능
- 자동 마인드맵 생성
- 계층 구조 분석
- 스마트 레이아웃
- Mermaid 다이어그램 변환

## 📝 라이센스

개인 프로젝트

## 🤝 기여

이슈 및 PR 환영합니다!
