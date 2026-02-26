-- ============================================================
-- 영단어 학습 앱 - Supabase SQL 초기화 스크립트
-- Supabase Dashboard > SQL Editor 에서 실행하세요.
-- ※ 이미 테이블이 있어도 안전하게 재실행할 수 있습니다.
-- ============================================================

-- 기존 테이블 삭제 (재실행 안전)
DROP TABLE IF EXISTS public.battle_rooms CASCADE;
DROP TABLE IF EXISTS public.words CASCADE;

-- ----------------------------------------------------------
-- 1. words 테이블
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.words (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type       text NOT NULL DEFAULT 'word',
  level      text NOT NULL,          -- 'elem_low' | 'elem_mid' | 'elem_high' | 'middle' | 'high'
  set_no     int  NOT NULL,          -- 세트 번호
  word       text NOT NULL,          -- 영단어
  mean_1     text NOT NULL,          -- 기본 뜻
  mean_2     text,                   -- 추가 뜻 (선택)
  mean_3     text,                   -- 추가 뜻 (선택)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_words_level_set ON public.words (level, set_no);

-- RLS 활성화 (모든 사용자가 읽기 가능)
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "words_read_all" ON public.words
  FOR SELECT USING (true);

-- ----------------------------------------------------------
-- 2. battle_rooms 테이블
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.battle_rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code    text NOT NULL UNIQUE,           -- 6자리 입장 코드
  host_id      uuid NOT NULL,                  -- 방장 user id
  guest_id     uuid,                           -- 참가자 user id (null = 대기 중)
  level        text NOT NULL,
  set_no       int  NOT NULL,
  status       text NOT NULL DEFAULT 'waiting', -- 'waiting' | 'playing' | 'finished'
  host_score   int  NOT NULL DEFAULT 0,
  guest_score  int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_battle_rooms_code   ON public.battle_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON public.battle_rooms (status);

-- RLS 활성화
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;

-- 방 조회: 누구나 가능
CREATE POLICY "battle_rooms_read_all" ON public.battle_rooms
  FOR SELECT USING (true);

-- 방 생성: 로그인 사용자만
CREATE POLICY "battle_rooms_insert_auth" ON public.battle_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- 방 수정: 방장 또는 참가자만
CREATE POLICY "battle_rooms_update_participants" ON public.battle_rooms
  FOR UPDATE USING (
    auth.uid() = host_id OR auth.uid() = guest_id
  );

-- ----------------------------------------------------------
-- 3. 샘플 데이터 (elem_low_data.csv 기반, Set 1)
-- ----------------------------------------------------------
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3) VALUES
  ('word', 'elem_low', 1, 'apple',  '사과',     null,       null),
  ('word', 'elem_low', 1, 'book',   '책',        null,       null),
  ('word', 'elem_low', 1, 'cat',    '고양이',   null,       null),
  ('word', 'elem_low', 1, 'dog',    '개',        null,       null),
  ('word', 'elem_low', 1, 'egg',    '달걀',     '계란',     null),
  ('word', 'elem_low', 1, 'fish',   '물고기',   '생선',     null),
  ('word', 'elem_low', 1, 'girl',   '소녀',     '여자아이', null),
  ('word', 'elem_low', 1, 'hand',   '손',        null,       null),
  ('word', 'elem_low', 1, 'ice',    '얼음',     null,       null),
  ('word', 'elem_low', 1, 'jump',   '점프하다', '뛰다',     null),
  ('word', 'elem_low', 1, 'king',   '왕',        '임금',     null),
  ('word', 'elem_low', 1, 'lion',   '사자',     null,       null),
  ('word', 'elem_low', 1, 'mom',    '엄마',     null,       null),
  ('word', 'elem_low', 1, 'nose',   '코',        null,       null),
  ('word', 'elem_low', 1, 'orange', '오렌지',   '주황색',   null),
  ('word', 'elem_low', 1, 'pig',    '돼지',     null,       null),
  ('word', 'elem_low', 1, 'queen',  '여왕',     null,       null),
  ('word', 'elem_low', 1, 'rain',   '비',        '비가 오다',null),
  ('word', 'elem_low', 1, 'sun',    '태양',     '해',       null),
  ('word', 'elem_low', 1, 'tree',   '나무',     null,       null),
  -- Set 2
  ('word', 'elem_low', 2, 'water',   '물',        null,   null),
  ('word', 'elem_low', 2, 'milk',    '우유',     null,   null),
  ('word', 'elem_low', 2, 'bread',   '빵',        null,   null),
  ('word', 'elem_low', 2, 'school',  '학교',     null,   null),
  ('word', 'elem_low', 2, 'teacher', '선생님',   null,   null),
  ('word', 'elem_low', 2, 'friend',  '친구',     null,   null),
  ('word', 'elem_low', 2, 'house',   '집',        null,   null),
  ('word', 'elem_low', 2, 'door',    '문',        null,   null),
  ('word', 'elem_low', 2, 'window',  '창문',     null,   null),
  ('word', 'elem_low', 2, 'chair',   '의자',     null,   null),
  ('word', 'elem_low', 2, 'desk',    '책상',     null,   null),
  ('word', 'elem_low', 2, 'pencil',  '연필',     null,   null),
  ('word', 'elem_low', 2, 'bag',     '가방',     null,   null),
  ('word', 'elem_low', 2, 'ball',    '공',        null,   null),
  ('word', 'elem_low', 2, 'bird',    '새',        null,   null),
  ('word', 'elem_low', 2, 'cow',     '소',        null,   null),
  ('word', 'elem_low', 2, 'duck',    '오리',     null,   null),
  ('word', 'elem_low', 2, 'fire',    '불',        null,   null),
  ('word', 'elem_low', 2, 'star',    '별',        null,   null),
  ('word', 'elem_low', 2, 'moon',    '달',        null,   null),
  -- Set 3
  ('word', 'elem_low', 3, 'red',    '빨간색',   null,       null),
  ('word', 'elem_low', 3, 'blue',   '파란색',   null,       null),
  ('word', 'elem_low', 3, 'green',  '초록색',   null,       null),
  ('word', 'elem_low', 3, 'yellow', '노란색',   null,       null),
  ('word', 'elem_low', 3, 'white',  '흰색',     null,       null),
  ('word', 'elem_low', 3, 'black',  '검은색',   null,       null),
  ('word', 'elem_low', 3, 'big',    '큰',        null,       null),
  ('word', 'elem_low', 3, 'small',  '작은',     null,       null),
  ('word', 'elem_low', 3, 'long',   '긴',        null,       null),
  ('word', 'elem_low', 3, 'short',  '짧은',     null,       null),
  ('word', 'elem_low', 3, 'fast',   '빠른',     null,       null),
  ('word', 'elem_low', 3, 'slow',   '느린',     null,       null),
  ('word', 'elem_low', 3, 'happy',  '행복한',   null,       null),
  ('word', 'elem_low', 3, 'sad',    '슬픈',     null,       null),
  ('word', 'elem_low', 3, 'hot',    '뜨거운',   '더운',     null),
  ('word', 'elem_low', 3, 'cold',   '차가운',   '추운',     null),
  ('word', 'elem_low', 3, 'good',   '좋은',     null,       null),
  ('word', 'elem_low', 3, 'bad',    '나쁜',     null,       null),
  ('word', 'elem_low', 3, 'old',    '오래된',   '나이든',   null),
  ('word', 'elem_low', 3, 'new',    '새로운',   null,       null)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------
-- 4. profiles 테이블 (입시내비 유저 매핑)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS public.study_logs  CASCADE;
DROP TABLE IF EXISTS public.profiles    CASCADE;

CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL,   -- 입시내비 student_id
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_external_id ON public.profiles (external_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 조회/수정 가능
CREATE POLICY "profiles_self" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Supabase Auth 유저 생성 시 profile 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, external_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'external_id', NEW.id::text)
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------
-- 5. study_logs 테이블 (단어별 학습 기록)
-- ----------------------------------------------------------
CREATE TABLE public.study_logs (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id    bigint NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_logs_user_word ON public.study_logs (user_id, word_id);

ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- 본인 기록만 쓰기/읽기 가능
CREATE POLICY "study_logs_own" ON public.study_logs
  FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 6. battle_rooms 테이블 (실시간 배틀 로비 및 게임 상태 관리)
-- ----------------------------------------------------------
CREATE TABLE public.battle_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code varchar(6) NOT NULL UNIQUE,
  host_id uuid REFERENCES auth.users(id) NOT NULL,
  guest_id uuid REFERENCES auth.users(id),
  status varchar(20) NOT NULL DEFAULT 'waiting', -- waiting, playing, finished
  level varchar(50) NOT NULL,
  set_no integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;

-- 누구나 방을 조회할 수 있음 (코드로 진입하기 위함)
CREATE POLICY "Anyone can view battle rooms" ON public.battle_rooms
  FOR SELECT USING (true);

-- 인증된 사용자만 방을 생성할 수 있음
CREATE POLICY "Authenticated users can create rooms" ON public.battle_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

-- 방장과 게스트만 방 상태를 업데이트할 수 있음
CREATE POLICY "Participants can update room" ON public.battle_rooms
  FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- updated_at 자동 갱신을 위한 Trigger 재생성 또는 연결 (Postgres 확장 기능 moddatetime 사용 시 생략 가능, 여기선 단순 처리)
DROP TRIGGER IF EXISTS handle_battle_rooms_updated_at ON public.battle_rooms;
-- (moddatetime 익스텐션이 필요하다면 아래 주석 해제하여 사용)
-- CREATE TRIGGER handle_battle_rooms_updated_at BEFORE UPDATE ON public.battle_rooms
--   FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
