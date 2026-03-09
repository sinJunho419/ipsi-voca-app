-- ══════════════════════════════════════════════════════
-- 리벤지 배틀 모드 지원
-- ══════════════════════════════════════════════════════

-- battle_rooms에 모드 컬럼 추가
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'normal';

ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS question_count integer NOT NULL DEFAULT 10;

-- 모드 체크 제약
DO $$ BEGIN
  ALTER TABLE public.battle_rooms
    ADD CONSTRAINT chk_battle_rooms_mode CHECK (mode IN ('normal', 'revenge'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
