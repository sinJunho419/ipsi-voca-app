# 입시내비 - 영단어 학습 앱 연동(SSO) 기술 가이드

이 문서는 기존 **'입시내비'** 플랫폼과 새롭게 구축된 **'영단어 학습 앱'** 간의 심리스한 사용자 경험(Seamless UX)을 제공하기 위한 Single Sign-On(SSO) 연동 방법을 설명합니다.

---

## 1. 개요 (Architecture Overview)

영단어 학습 앱은 별도의 회원가입 절차 없이, 입시내비의 회원 식별자(External ID)를 신뢰하여 백그라운드에서 자동으로 Supabase 계정을 매핑/생성하고 로그인 세션을 발급하는 방식(SSO)을 채택합니다.

*   **인증 흐름 (Authentication Flow):**
    1.  **[입시내비 웹/앱]** 학생이 로그인된 상태에서 "영단어 학습하기" 버튼 클릭
    2.  **[입시내비 서버]** 학생의 고유 식별자(PK)와 기본 정보를 담아 **JWT 토큰** 생성 및 서명(Sign)
    3.  **[입시내비 웹/앱]** 생성된 JWT 토큰을 쿼리 스트링 파라미터로 첨부하여 영단어 학습 앱으로 리다이렉트 (예: `https://voca-app.com/api/auth/sso?token={JWT_TOKEN}`)
    4.  **[영단어 앱 서버 (Next.js API Route)]** 전달받은 JWT 암호 키를 통해 서명 검증(Verify)
    5.  **[영단어 앱 서버]** 검증 성공 시, 포함된 `external_id`를 조회하여 기존 유저면 즉시 로그인 세션(쿠키) 생성, 신규 유저면 Supabase User 및 Profile 자동 생성 후 로그인 처리
    6.  **[영단어 앱 클라이언트]** 인증이 완료된 상태로 성공적으로 메인 페이지 진입

---

## 2. 입시내비 측 개발 요구사항 (JWT 토큰 생성)

입시내비 서버는 영단어 앱으로 사용자를 보낼 때, 반드시 **사전 협의된 Secret Key(비밀 키)**를 사용하여 HMAC SHA256 (HS256) 알고리즘으로 JWT를 생성 및 서명해야 합니다.

### 2.1 JWT Payload 규격
토큰의 Payload에는 다음 정보가 포함되어야 합니다.

```json
{
  "external_id": "user_12345",   // (필수) 입시내비 측의 고유 회원 식별자 (PK 또는 고유 문자열)
  "name": "홍길동",                // (선택) 학생 이름 (표시 목적)
  "role": "student",             // (선택) 권한 (student, teacher, admin 등)
  "exp": 1715000000,             // (필수) 토큰 만료 시간 (Unix Timestamp). 보안을 위해 생성 시점으로부터 짧게(예: 30초~1분) 설정 권장
  "iat": 1714999940              // (권장) 토큰 발급 시간
}
```

### 2.2 JWT 생성 예시 (Node.js 환경 기준)

```javascript
const jwt = require('jsonwebtoken');

// 양측 서버에서만 가지고 있어야 할 안전하고 긴 보안 문자열 (절대 클라이언트에 노출 금지)
const SHARED_SECRET_KEY = "EN토큰_암호화_비밀키_VERY_SECRET_123!@#"; 

function generateSSOToken(student) {
  const payload = {
    external_id: String(student.id), 
    name: student.name,
    role: student.role
  };

  // expiresIn을 매우 짧게 '1m'(1분) 정도로 설정하여 탈취된 토큰의 재사용(Replay Attack) 방지
  const token = jwt.sign(payload, SHARED_SECRET_KEY, { expiresIn: '1m', algorithm: 'HS256' });
  
  return token;
}

// 생성된 링크 예시: https://voca-app.com/api/auth/sso?token=eyJhbGciOi...
```

### 2.3 클라이언트 연동 (프론트엔드)

웹 브라우저 혹은 앱의 웹뷰(WebView)에서 아래와 같은 방식으로 새 창(혹은 현재 창)을 띄워 이동시킵니다.

```html
<!-- 입시내비 프론트엔드 화면 -->
<button onclick="goToVocaApp()">영단어 학습 / 배틀하기</button>

<script>
async function goToVocaApp() {
  // 1. 입시내비 서버에 SSO 토큰 발급 요청
  const response = await fetch('/api/get-voca-token'); 
  const { token } = await response.json();
  
  // 2. 발급받은 토큰을 붙여서 영단어 앱으로 이동 (운영 도메인으로 변경 예정)
  window.location.href = `https://voca-app.com/api/auth/sso?token=${token}`;
}
</script>
```

---

## 3. 학습 기록 회수 (옵션: Webhook 연동)

학생이 영단어 앱에서 테스트를 통과하거나, 특정 세트를 완료했을 때 입시내비 서버 측에서도 이 정보를 알아야 한다면(예: 포도알 지급, 과제 달성률 반영 등), 영단어 앱에서 입시내비 API로 Event를 쏘아줄 수 있습니다.

### 요청 형태 (영단어 앱 -> 입시내비 서버)
- **Method**: `POST`
- **URL**: `https://ipsi-navi.com/api/webhook/voca-progress` (입시내비 측에 만들어야 할 API)
- **Header**: `Authorization: Bearer {사전 협의된 Webhook Secret}`
- **Body**:
```json
{
  "event": "set_cleared",
  "external_id": "user_12345",
  "level": "middle_1",
  "set_no": 3,
  "timestamp": "2024-05-15T10:30:00Z"
}
```

해당 Webhook API를 입시내비 개발자분께서 만들어 주시고 엔드포인트를 알려주시면, 영단어 앱(Supabase Database Webhook 기능 등 활용)에서 이벤트 발생 즉시 결과를 쏘아드리도록 연동할 수 있습니다.

---

## 4. 진행 전 확인 및 협의 사항

1. **`SHARED_SECRET_KEY` 발급 및 공유:** 토큰 암/복호화에 사용할 강력한 비밀 키를 하나 생성하여 양측 서버 환경 변수(`.env`)에 동일하게 셋팅해야 합니다.
2. **영단어 앱 배포 도메인:** 추후 Vercel 등으로 최종 배포된 도메인 주소(예: `https://words.ipsi-navi.com`)를 확정해야 합니다.
3. **토큰 유효기간 정책:** `exp`(만료시간)는 1~3분 내외의 짧은 시간으로 설정하는 것을 권장합니다.

궁금하신 점이 있다면 언제든 문의해 주시기 바랍니다.
