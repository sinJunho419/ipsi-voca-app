-- SSO 일회용 토큰 관리를 위한 테이블 생성
CREATE TABLE IF NOT EXISTS public.sso_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_sso_tokens_token ON public.sso_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_expires_at ON public.sso_tokens(expires_at);

-- RLS 설정 (Service Role만 접근 가능하도록 설정하는 것이 안전)
ALTER TABLE public.sso_tokens ENABLE ROW LEVEL SECURITY;

-- 관리를 위한 서버 측 접근만 허용하거나, 필요에 따라 정책 추가
CREATE POLICY "Service role only access" 
ON public.sso_tokens 
FOR ALL 
TO service_role 
USING (true);

COMMENT ON TABLE public.sso_tokens IS '입시내비 SSO 연동을 위한 일회용 토큰 저장소';
