-- 1. profiles 테이블 확장
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academy_id text;

-- 2. battle_history 테이블 생성
CREATE TABLE IF NOT EXISTS public.battle_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid,
  participants_ids uuid[] NOT NULL,
  scores jsonb NOT NULL, -- {user_id: score}
  winner_id uuid,
  wrong_words jsonb, -- {user_id: [word_id, ...]}
  academy_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 설정
ALTER TABLE public.battle_history ENABLE ROW LEVEL SECURITY;

-- 같은 학년/학원 사람들의 기록을 볼 수 있게 하거나, 
-- 일단 피드용으로 academy_id가 같은 데이터만 SELECT 허용
CREATE POLICY "battle_history_academy_select" ON public.battle_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND academy_id = battle_history.academy_id
    )
  );

CREATE POLICY "battle_history_insert" ON public.battle_history
  FOR INSERT WITH CHECK (true);

-- 3. 상대 전적 RPC 생성
CREATE OR REPLACE FUNCTION get_h2h_stats(my_id uuid, opponent_id uuid)
RETURNS TABLE(wins int, losses int) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE winner_id = my_id)::int as wins,
    COUNT(*) FILTER (WHERE winner_id = opponent_id)::int as losses
  FROM public.battle_history
  WHERE participants_ids @> ARRAY[my_id, opponent_id];
END;
$$ LANGUAGE plpgsql;

-- 4. 리얼타임 설정 (Supabase 대시보드에서 하거나 SQL로 가능할 경우)
-- 보통 Publication에 테이블 추가
-- ALTER PUBLICATION supabase_realtime ADD TABLE battle_history;
