/**
 * Firebase Cloud Functions for Connect the Dot (간단한 버전)
 * OpenAI API 프록시 - Secret 없이 배포 테스트용
 */

const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Firebase Admin 초기화
admin.initializeApp();

/**
 * 인증 확인 미들웨어
 */
async function verifyAuth(req, res) {
    // CORS 헤더 설정
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: { message: '인증이 필요합니다. 로그인 후 사용해주세요.' }
        });
        return null;
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('토큰 검증 실패:', error);
        res.status(401).json({
            error: { message: '유효하지 않은 인증 토큰입니다.' }
        });
        return null;
    }
}

/**
 * OpenAI ChatGPT API 호출 (간단한 버전 - Secret 없이)
 */
exports.generateMindmap = onRequest({
    cors: true,
    region: 'us-central1'
}, async (req, res) => {
    // OPTIONS 요청 처리 (preflight)
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');
        return res.status(204).send('');
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(405).json({
            error: { message: 'POST 요청만 허용됩니다.' }
        });
    }

    // 인증 확인
    const user = await verifyAuth(req, res);
    if (!user) return;

    console.log('인증된 사용자:', user.uid);

    // API 키는 환경 변수에서 가져오기 (나중에 Secret으로 변경)
    // 임시로 환경 변수 사용
    const OPENAI_API_KEY = process.env.OPENAI_KEY;
    
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API 키가 설정되지 않았습니다.');
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: { message: '서버 설정 오류입니다. 관리자에게 문의하세요.' }
        });
    }

    // 요청 데이터
    const { messages, model = 'gpt-4o', temperature = 0.3, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(400).json({
            error: { message: 'messages 파라미터가 필요합니다.' }
        });
    }

    try {
        // OpenAI API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenAI API 오류:', data);
            res.set('Access-Control-Allow-Origin', '*');
            return res.status(response.status).json({
                error: data.error || { message: 'OpenAI API 호출 실패' }
            });
        }

        // 성공 응답
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(200).json(data);

    } catch (error) {
        console.error('함수 실행 오류:', error);
        res.set('Access-Control-Allow-Origin', '*');
        return res.status(500).json({
            error: { message: error.message || '서버 오류가 발생했습니다.' }
        });
    }
});

