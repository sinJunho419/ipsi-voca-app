-- ============================================================
-- 배틀 누락 컬럼 일괄 추가 (battle_sync + revenge_battle 통합)
-- Supabase SQL Editor에서 한 번 실행하세요
-- ============================================================

-- 1. N인 대전용 컬럼
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}';
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 50;

-- 2. 동일 문제 동기화
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS question_ids integer[];

-- 3. 방 종료 시각
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 4. 리벤지 모드
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'normal';
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS question_count integer NOT NULL DEFAULT 10;

-- 5. 모드 체크 제약
DO $$ BEGIN
  ALTER TABLE public.battle_rooms
    ADD CONSTRAINT chk_battle_rooms_mode CHECK (mode IN ('normal', 'revenge'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. 원자적 방 입장 함수
CREATE OR REPLACE FUNCTION join_battle_room(p_room_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.battle_rooms
  SET participant_ids = array_append(participant_ids, p_user_id),
      updated_at = now()
  WHERE id = p_room_id
    AND NOT (p_user_id = ANY(participant_ids))
    AND (array_length(participant_ids, 1) IS NULL OR array_length(participant_ids, 1) < max_players)
    AND status = 'waiting';

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- 7. 원자적 방 퇴장 + 방장 자동 위임
CREATE OR REPLACE FUNCTION leave_battle_room(p_room_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
  current_host uuid;
  remaining uuid[];
BEGIN
  SELECT host_id INTO current_host FROM public.battle_rooms WHERE id = p_room_id;

  UPDATE public.battle_rooms
  SET participant_ids = array_remove(participant_ids, p_user_id),
      updated_at = now()
  WHERE id = p_room_id;

  IF current_host = p_user_id THEN
    SELECT participant_ids INTO remaining FROM public.battle_rooms WHERE id = p_room_id;
    IF array_length(remaining, 1) > 0 THEN
      UPDATE public.battle_rooms SET host_id = remaining[1] WHERE id = p_room_id;
    ELSE
      UPDATE public.battle_rooms
      SET status = 'finished', finished_at = now()
      WHERE id = p_room_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
