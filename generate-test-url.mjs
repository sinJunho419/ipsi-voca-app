// 테스트용 SSO 토큰 생성 스크립트 (Node.js 환경)
// 실행 방법: node generate-test-url.mjs

import crypto from 'crypto';

// .env.local에 설정한 AUTH_HMAC_SECRET 값과 동일해야 합니다!
const SECRET = 'your-hmac-secret-here'; // 실제 환경변수로 변경하세요
const USER_ID = 'test_user_999';

// 1. 현재 타임스탬프 (초)
const ts = Math.floor(Date.now() / 1000).toString();

// 2. 검증 문자열 (user_id + ts)
const payload = USER_ID + ts;

// 3. HMAC-SHA256 해시 생성
const token = crypto
  .createHmac('sha256', SECRET)
  .update(payload)
  .digest('hex');

// 4. 최종 리다이렉트 URL 생성
// 로컬 테스트용
const localUrl = `http://localhost:3000/api/auth/sso?user_id=${USER_ID}&ts=${ts}&token=${token}`;
// Vercel 운영 서버 테스트용
const prodUrl = `https://ipsi-voca-app.vercel.app/api/auth/sso?user_id=${USER_ID}&ts=${ts}&token=${token}`;

console.log('=== 로컬 테스트용 URL ===');
console.log(localUrl);
console.log('\n=== 운영 서버용 URL ===');
console.log(prodUrl);
