-- ══════════════════════════════════════════════════════
-- 주간 리포트 시스템
-- ══════════════════════════════════════════════════════

-- 1. 테이블
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  total_battles integer NOT NULL DEFAULT 0,
  win_rate numeric(5,1) NOT NULL DEFAULT 0,
  mastered_count integer NOT NULL DEFAULT 0,
  top_rival_id uuid,
  daily_activity jsonb NOT NULL DEFAULT '{}',
  academy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_user ON public.weekly_reports (user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_academy ON public.weekly_reports (academy_id, week_start);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_reports_select" ON public.weekly_reports
  FOR SELECT USING (
    auth.uid() = user_id
    OR academy_id = (SELECT academy_id FROM profiles WHERE id = auth.uid())
  );

-- 2. 주간 리포트 생성 함수 (매주 월요일 실행)
CREATE OR REPLACE FUNCTION generate_weekly_reports(p_week_start date DEFAULT NULL)
RETURNS integer AS $$
DECLARE
  ws date;
  we date;
  report_count integer := 0;
  uid uuid;
  v_total integer;
  v_wins integer;
  v_mastered integer;
  v_rival uuid;
  v_daily jsonb;
  v_academy text;
BEGIN
  -- 기본값: 지난주 월요일
  IF p_week_start IS NULL THEN
    ws := (date_trunc('week', CURRENT_DATE) - interval '7 days')::date;
  ELSE
    ws := p_week_start;
  END IF;
  we := ws + interval '7 days';

  -- 해당 기간 활동한 모든 유저 순회
  FOR uid IN
    SELECT DISTINCT unnest(participants_ids)
    FROM battle_history
    WHERE created_at >= ws AND created_at < we
  LOOP
    -- 총 배틀 수
    SELECT COUNT(*) INTO v_total
    FROM battle_history
    WHERE created_at >= ws AND created_at < we
      AND uid = ANY(participants_ids);

    -- 승리 수
    SELECT COUNT(*) INTO v_wins
    FROM battle_history
    WHERE created_at >= ws AND created_at < we
      AND winner_id = uid;

    -- 졸업 단어 수 (전체 기간)
    SELECT COUNT(*) INTO v_mastered
    FROM wrong_answers
    WHERE user_id = uid AND status = 'Mastered';

    -- 최다 대전 상대
    SELECT opponent INTO v_rival
    FROM (
      SELECT unnest(participants_ids) as opponent
      FROM battle_history
      WHERE created_at >= ws AND created_at < we
        AND uid = ANY(participants_ids)
    ) sub
    WHERE opponent != uid
    GROUP BY opponent
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- 요일별 활동량 (ISO: 1=월 ~ 7=일)
    SELECT COALESCE(jsonb_object_agg(dow, cnt), '{}'::jsonb) INTO v_daily
    FROM (
      SELECT EXTRACT(ISODOW FROM created_at)::text as dow, COUNT(*) as cnt
      FROM battle_history
      WHERE created_at >= ws AND created_at < we
        AND uid = ANY(participants_ids)
      GROUP BY EXTRACT(ISODOW FROM created_at)
    ) sub;

    -- 학원 ID
    SELECT academy_id INTO v_academy FROM profiles WHERE id = uid;

    -- Upsert
    INSERT INTO weekly_reports (
      user_id, week_start, total_battles, win_rate,
      mastered_count, top_rival_id, daily_activity, academy_id
    ) VALUES (
      uid, ws, v_total,
      CASE WHEN v_total > 0 THEN ROUND(v_wins::numeric / v_total * 100, 1) ELSE 0 END,
      v_mastered, v_rival, v_daily, v_academy
    )
    ON CONFLICT (user_id, week_start) DO UPDATE SET
      total_battles = EXCLUDED.total_battles,
      win_rate = EXCLUDED.win_rate,
      mastered_count = EXCLUDED.mastered_count,
      top_rival_id = EXCLUDED.top_rival_id,
      daily_activity = EXCLUDED.daily_activity,
      academy_id = EXCLUDED.academy_id;

    report_count := report_count + 1;
  END LOOP;

  RETURN report_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. pg_cron 스케줄 (Supabase 대시보드에서 pg_cron 확장 활성화 후 실행)
-- SELECT cron.schedule(
--   'generate-weekly-reports',
--   '0 0 * * 1',   -- 매주 월요일 00:00 UTC
--   $$SELECT generate_weekly_reports()$$
-- );
