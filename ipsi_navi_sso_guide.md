# 입시내비 - 입시보카(영단어) 연동 가이드

입시보카는 입시내비 앱 안에서 WebView로 동작하는 영단어 학습 기능입니다.
입시내비의 로그인 정보를 이용해 **별도 로그인 없이** 바로 학습 페이지에 진입합니다.

---

## 1. 동작 방식: Signed URL 자동인증

```
입시내비 앱에서 "영단어 학습" 터치
  ↓
앱이 HMAC 서명된 URL 생성
  ↓
WebView로 열기: https://voca-app.com/api/auth/auto?nid=123&ts=...&sig=...
  ↓
영단어 앱 서버가 서명 자체 검증 (입시내비 서버 호출 없음)
  ↓
세션 쿠키 설정 → /study 페이지 바로 표시
```

**입시내비 서버에 부하 없음** — 서명 생성만 하면 되고, 검증은 영단어 앱 서버가 공유 키로 자체 처리합니다.

---

## 2. 입시내비 측 개발 요구사항

### 2.1 서명 URL 생성 (핵심 — 이것만 하면 됩니다)

```
URL = https://voca-app.com/api/auth/auto
      ?nid={숫자PK}
      &ts={현재 Unix Timestamp 초}
      &sig={HMAC-SHA256 서명}
      &sname={학생이름}        ← 선택
      &user_id={한글아이디}     ← 선택
```

**서명 생성 규칙:**
```
message = nid + ":" + ts
sig = HMAC-SHA256(message, 공유시크릿키)  →  hex 문자열
```

### 2.2 Classic ASP 예시

```vbscript
<%
Function HmacSHA256(message, secret)
    Dim objHMAC
    Set objHMAC = Server.CreateObject("System.Security.Cryptography.HMACSHA256")

    Dim enc
    Set enc = Server.CreateObject("System.Text.UTF8Encoding")

    objHMAC.Key = enc.GetBytes_4(secret)
    Dim hash
    hash = objHMAC.ComputeHash_2(enc.GetBytes_4(message))

    ' byte 배열 → hex 문자열 변환
    Dim sb, i
    Set sb = Server.CreateObject("System.Text.StringBuilder")
    For i = 0 To UBound(hash)
        sb.AppendFormat "{0:x2}", hash(i)
    Next
    HmacSHA256 = sb.ToString()

    Set objHMAC = Nothing
    Set enc = Nothing
    Set sb = Nothing
End Function

' ─── 사용 예시 ───
Dim nid, sname, ts, sig, url
Dim SHARED_SECRET
SHARED_SECRET = "양측이_공유하는_비밀키_여기에"

nid   = Session("nid")    ' 숫자 PK
sname = Session("sname")  ' 학생 이름

ts  = DateDiff("s", "1970-01-01 00:00:00", DateAdd("h", -9, Now()))  ' UTC Unix timestamp
sig = HmacSHA256(nid & ":" & ts, SHARED_SECRET)

url = "https://voca-app.com/api/auth/auto?nid=" & nid & "&ts=" & ts & "&sig=" & sig
If sname <> "" Then url = url & "&sname=" & Server.URLEncode(sname)

' WebView에서 이 URL을 열면 됩니다
Response.Redirect url
%>
```

### 2.3 JavaScript 예시 (WebView에서 열 때)

```javascript
// 입시내비 앱 (네이티브 or 프론트엔드)
function openVocaApp(nid, sname) {
  // 서버에서 서명된 URL 받아오기
  fetch('/api/get-voca-url?nid=' + nid)
    .then(r => r.json())
    .then(data => {
      // WebView로 열기
      window.location.href = data.url;
      // 또는 네이티브: openWebView(data.url)
    });
}
```

---

## 3. 파라미터 규격

### 자동인증 URL

`GET https://voca-app.com/api/auth/auto?nid=...&ts=...&sig=...`

| 파라미터 | 필수 | 설명 | 예시 |
|----------|------|------|------|
| `nid` | O | 입시내비 숫자 PK (유니크) | `12345` |
| `ts` | O | Unix Timestamp (초) | `1710000000` |
| `sig` | O | HMAC-SHA256(nid:ts, 공유키) hex | `a1b2c3...` |
| `sname` | X | 학생 이름 | `홍길동` |
| `user_id` | X | 한글 아이디 (참고용 저장) | `길동이` |
| `redirect` | X | 인증 후 이동할 경로 (기본: /study) | `/battle/lobby` |

> **sname 없으면** "학생_12345" 형태로 자동 표시됩니다.
> **토큰 유효시간**: 5분 (ts 기준). 5분 지나면 다시 서명 필요.

### 로그아웃 API (입시내비에서 로그아웃 시 호출)

`POST https://voca-app.com/api/auth/logout`

```json
{ "nid": "12345", "secret": "로그아웃용_공유시크릿" }
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `nid` | O | 로그아웃할 학생의 숫자 PK |
| `secret` | O | 사전 협의된 로그아웃 시크릿 |

---

## 4. 데이터 매핑

| 입시내비 | 영단어 앱 (Supabase) | 설명 |
|----------|---------------------|------|
| `nid` (12345) | email: `nid_12345@inputnavi.internal` | 유저 식별 키 |
| `sname` | profiles.name | 학생 이름 (표시용) |
| `user_id` | user_metadata.external_user_id | 한글 아이디 (참고용) |

---

## 5. 진행 전 협의 사항

1. **공유 시크릿 키 (`AUTH_HMAC_SECRET`)**: 서명 생성/검증에 사용할 키. `openssl rand -hex 32`로 생성 권장.
2. **로그아웃 시크릿 (`IPSI_NAVI_LOGOUT_SECRET`)**: 로그아웃 API 호출 인증용 별도 키.
3. **배포 도메인**: `voca-app.com` 부분을 실제 Vercel 배포 도메인으로 교체.

---

## 6. 보안 정리

| 항목 | 처리 방식 |
|------|----------|
| 위변조 방지 | HMAC-SHA256 서명 (공유 시크릿) |
| URL 재사용 방지 | 타임스탬프 5분 유효 |
| 입시내비 서버 부하 | **없음** (서명 생성만, API 호출 없음) |
| 시크릿 노출 방지 | 서버 환경변수에만 저장, 클라이언트 노출 안 함 |
