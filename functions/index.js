/**
 * Firebase Cloud Functions for Connect the Dot
 * OpenAI API 프록시 (인증된 사용자만 접근 가능)
 * Functions v1 사용
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
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
 * 사용량 제한 확인 (선택적)
 * Firestore에 사용자별 일일 사용 횟수 저장
 */
async function checkRateLimit(userId) {
    const today = new Date().toISOString().split('T')[0];
    const userDoc = admin.firestore().collection('usage').doc(`${userId}_${today}`);

    const doc = await userDoc.get();
    const currentCount = doc.exists ? doc.data().count : 0;

    // 일일 50회 제한 (필요에 따라 조정)
    const DAILY_LIMIT = 50;

    if (currentCount >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    // 사용 횟수 증가
    await userDoc.set({
        count: currentCount + 1,
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { allowed: true, remaining: DAILY_LIMIT - currentCount - 1 };
}

/**
 * OpenAI ChatGPT API 호출
 */
exports.generateMindmap = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        // POST 요청만 허용
        if (req.method !== 'POST') {
            return res.status(405).json({
                error: { message: 'POST 요청만 허용됩니다.' }
            });
        }

        // 인증 확인
        const user = await verifyAuth(req, res);
        if (!user) return;

        console.log('인증된 사용자:', user.uid);

        // 사용량 제한 확인
        const rateLimit = await checkRateLimit(user.uid);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: {
                    message: '일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요.',
                    remaining: 0
                }
            });
        }

        console.log('남은 사용 횟수:', rateLimit.remaining);

        // API 키 확인 (Firebase Functions config에서 가져오기)
        const OPENAI_API_KEY = functions.config().openai?.key;
        if (!OPENAI_API_KEY) {
            console.error('OpenAI API 키가 설정되지 않았습니다.');
            return res.status(500).json({
                error: { message: '서버 설정 오류입니다. 관리자에게 문의하세요.' }
            });
        }

        // 요청 데이터
        const { messages, model = 'gpt-4o', temperature = 0.3, max_tokens = 2000 } = req.body;

        if (!messages || !Array.isArray(messages)) {
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
                return res.status(response.status).json({
                    error: data.error || { message: 'OpenAI API 호출 실패' }
                });
            }

            // 성공 응답 (사용량 정보 포함)
            return res.status(200).json({
                ...data,
                usage_info: {
                    remaining: rateLimit.remaining,
                    limit: 50
                }
            });

        } catch (error) {
            console.error('함수 실행 오류:', error);
            return res.status(500).json({
                error: { message: error.message || '서버 오류가 발생했습니다.' }
            });
        }
    });
});

/**
 * 사용량 확인 함수 (선택적)
 */
exports.checkUsage = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        const user = await verifyAuth(req, res);
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const userDoc = await admin.firestore()
            .collection('usage')
            .doc(`${user.uid}_${today}`)
            .get();

        const currentCount = userDoc.exists ? userDoc.data().count : 0;
        const DAILY_LIMIT = 50;

        return res.status(200).json({
            used: currentCount,
            remaining: DAILY_LIMIT - currentCount,
            limit: DAILY_LIMIT,
            reset_at: `${today}T23:59:59Z`
        });
    });
});
