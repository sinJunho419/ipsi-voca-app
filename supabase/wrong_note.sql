-- 오답노트(wrong_answers) 테이블 생성
CREATE TABLE IF NOT EXISTS public.wrong_answers (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id       bigint NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  wrong_count   int    NOT NULL DEFAULT 1,
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id) -- 한 사용자가 같은 단어를 여러 번 틀리면 업데이트(UPSERT) 하기 위함
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_wrong_answers_user ON public.wrong_answers (user_id);

-- RLS 설정
ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 CRUD 가능
DROP POLICY IF EXISTS "wrong_answers_select" ON public.wrong_answers;
CREATE POLICY "wrong_answers_select" ON public.wrong_answers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wrong_answers_insert" ON public.wrong_answers;
CREATE POLICY "wrong_answers_insert" ON public.wrong_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wrong_answers_update" ON public.wrong_answers;
CREATE POLICY "wrong_answers_update" ON public.wrong_answers FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wrong_answers_delete" ON public.wrong_answers;
CREATE POLICY "wrong_answers_delete" ON public.wrong_answers FOR DELETE USING (auth.uid() = user_id);

-- 오답 횟수 증가를 위한 RPC 함수
CREATE OR REPLACE FUNCTION public.increment_wrong_answer(u_id uuid, w_id bigint)
RETURNS void AS $$
BEGIN
  INSERT INTO public.wrong_answers (user_id, word_id, wrong_count, last_wrong_at)
  VALUES (u_id, w_id, 1, now())
  ON CONFLICT (user_id, word_id)
  DO UPDATE SET 
    wrong_count = wrong_answers.wrong_count + 1,
    last_wrong_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
