"""
OpenAI API 프록시 서버
CORS 문제 해결 및 API 키 보안을 위한 프록시
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

app = Flask(__name__)
CORS(app)  # 모든 출처에서의 요청 허용

# 환경변수에서 API 키 가져오기
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
PROXY_PORT = int(os.getenv('PROXY_PORT', 3001))

if not OPENAI_API_KEY:
    print("⚠️  경고: OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다!")

@app.route('/api/chat', methods=['POST'])
def chat():
    """OpenAI ChatGPT API 프록시"""
    try:
        # 클라이언트로부터 받은 데이터
        data = request.json

        # OpenAI API 호출
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENAI_API_KEY}'
            },
            json={
                'model': data.get('model', 'gpt-4o'),
                'messages': data.get('messages', []),
                'temperature': data.get('temperature', 0.3),
                'max_tokens': data.get('max_tokens', 2000)
            }
        )

        # OpenAI 응답을 그대로 클라이언트에 전달
        if response.ok:
            return jsonify(response.json())
        else:
            return jsonify({
                'error': response.json()
            }), response.status_code

    except Exception as e:
        return jsonify({
            'error': {
                'message': str(e)
            }
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'message': 'API 프록시 서버가 정상 작동 중입니다.',
        'api_key_configured': bool(OPENAI_API_KEY)
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 OpenAI API 프록시 서버 시작")
    print("=" * 50)
    print(f"📡 포트: {PROXY_PORT}")
    print(f"🔑 API 키 설정됨: {'✅' if OPENAI_API_KEY else '❌'}")
    print(f"🌐 주소: http://localhost:{PROXY_PORT}")
    print("=" * 50)
    print("\n💡 사용법:")
    print(f"   POST http://localhost:{PROXY_PORT}/api/chat")
    print(f"   GET  http://localhost:{PROXY_PORT}/health")
    print("\n⚠️  종료하려면 Ctrl+C를 누르세요\n")

    app.run(host='0.0.0.0', port=PROXY_PORT, debug=True)
