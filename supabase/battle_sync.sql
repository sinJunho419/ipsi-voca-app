-- ============================================================
-- 배틀 N인 대전 + 운영 안정성 마이그레이션
-- ============================================================

-- 1. N인 대전용 컬럼 추가
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}';
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 50;

-- 2. 동일 문제 동기화용 컬럼
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS question_ids integer[];

-- 3. 방 자동 정리용 종료 시각
ALTER TABLE public.battle_rooms ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- 4. 원자적 방 입장 함수 (레이스컨디션 방지)
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

-- 5. 원자적 방 퇴장 + 방장 자동 위임 함수
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

  -- 방장이 나간 경우: 다음 참여자에게 자동 위임
  IF current_host = p_user_id THEN
    SELECT participant_ids INTO remaining FROM public.battle_rooms WHERE id = p_room_id;
    IF array_length(remaining, 1) > 0 THEN
      UPDATE public.battle_rooms SET host_id = remaining[1] WHERE id = p_room_id;
    ELSE
      -- 마지막 인원 퇴장: 방 자동 종료
      UPDATE public.battle_rooms
      SET status = 'finished', finished_at = now()
      WHERE id = p_room_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
