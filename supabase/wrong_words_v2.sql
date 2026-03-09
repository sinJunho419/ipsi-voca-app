-- ══════════════════════════════════════════════════════
-- 오답 관리 시스템 v2 (졸업 시스템 + 자동 동기화)
-- ══════════════════════════════════════════════════════

-- 1. 기존 테이블 확장: 졸업 시스템 컬럼 추가
ALTER TABLE public.wrong_answers
  ADD COLUMN IF NOT EXISTS consecutive_correct int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Learning';

-- status 체크 제약
DO $$ BEGIN
  ALTER TABLE public.wrong_answers
    ADD CONSTRAINT chk_wrong_answers_status CHECK (status IN ('Learning', 'Mastered'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 인덱스: status별 빠른 조회
CREATE INDEX IF NOT EXISTS idx_wrong_answers_status
  ON public.wrong_answers (user_id, status);

-- ══════════════════════════════════════════════════════
-- 2. 배틀 종료 시 자동 동기화 트리거
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_wrong_words_from_battle()
RETURNS TRIGGER AS $$
DECLARE
  uid text;
  wids jsonb;
  wid integer;
BEGIN
  IF NEW.wrong_words IS NULL THEN
    RETURN NEW;
  END IF;

  FOR uid, wids IN SELECT * FROM jsonb_each(NEW.wrong_words)
  LOOP
    FOR wid IN SELECT jsonb_array_elements_text(wids)::integer
    LOOP
      INSERT INTO public.wrong_answers (user_id, word_id, wrong_count, consecutive_correct, status, last_wrong_at)
      VALUES (uid::uuid, wid, 1, 0, 'Learning', now())
      ON CONFLICT (user_id, word_id) DO UPDATE SET
        wrong_count = wrong_answers.wrong_count + 1,
        consecutive_correct = 0,
        status = 'Learning',
        last_wrong_at = now();
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 제거 후 재생성
DROP TRIGGER IF EXISTS trg_sync_wrong_words ON public.battle_history;
CREATE TRIGGER trg_sync_wrong_words
  AFTER INSERT ON public.battle_history
  FOR EACH ROW
  EXECUTE FUNCTION sync_wrong_words_from_battle();

-- ══════════════════════════════════════════════════════
-- 3. 학습 퀴즈용 오답 기록 RPC (다수 단어 한 번에)
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_wrong_words(p_user_id uuid, p_word_ids integer[])
RETURNS void AS $$
DECLARE
  wid integer;
BEGIN
  FOREACH wid IN ARRAY p_word_ids
  LOOP
    INSERT INTO public.wrong_answers (user_id, word_id, wrong_count, consecutive_correct, status, last_wrong_at)
    VALUES (p_user_id, wid, 1, 0, 'Learning', now())
    ON CONFLICT (user_id, word_id) DO UPDATE SET
      wrong_count = wrong_answers.wrong_count + 1,
      consecutive_correct = 0,
      status = 'Learning',
      last_wrong_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════
-- 4. 리벤지 퀴즈 — 정답 처리 (연속 정답 +1, 3회 시 졸업)
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_revenge_correct(p_user_id uuid, p_word_id integer)
RETURNS text AS $$
DECLARE
  new_count integer;
  new_status text;
BEGIN
  UPDATE public.wrong_answers
  SET consecutive_correct = consecutive_correct + 1
  WHERE user_id = p_user_id AND word_id = p_word_id;

  SELECT consecutive_correct INTO new_count
  FROM public.wrong_answers
  WHERE user_id = p_user_id AND word_id = p_word_id;

  IF new_count >= 3 THEN
    UPDATE public.wrong_answers
    SET status = 'Mastered'
    WHERE user_id = p_user_id AND word_id = p_word_id;
    new_status := 'Mastered';
  ELSE
    new_status := 'Learning';
  END IF;

  RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════
-- 5. 리벤지 퀴즈 — 오답 처리 (연속 정답 초기화)
-- ══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_revenge_wrong(p_user_id uuid, p_word_id integer)
RETURNS void AS $$
BEGIN
  UPDATE public.wrong_answers
  SET consecutive_correct = 0,
      wrong_count = wrong_count + 1,
      last_wrong_at = now()
  WHERE user_id = p_user_id AND word_id = p_word_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
