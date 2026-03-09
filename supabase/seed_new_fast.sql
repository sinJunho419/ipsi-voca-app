-- ============================================================
-- 영단어 학습 앱 - 통합 초기화 스크립트 (동기화 완료)
-- ============================================================

-- 1. 기존 테이블 삭제
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.battle_rooms CASCADE;
DROP TABLE IF EXISTS public.study_logs  CASCADE;
DROP TABLE IF EXISTS public.profiles    CASCADE;
DROP TABLE IF EXISTS public.words       CASCADE;

-- 2. words 테이블 생성
CREATE TABLE public.words (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type       text NOT NULL DEFAULT 'word',
  level      text NOT NULL,
  set_no     int  NOT NULL,
  word       text NOT NULL,
  mean_1     text NOT NULL,
  mean_2     text,                   
  mean_3     text,                   
  example_sentence text,             -- 마스터 챌린지용 예문
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_words_level_set ON public.words (level, set_no);
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "words_read_all" ON public.words FOR SELECT USING (true);

-- 3. battle_rooms 테이블 생성
CREATE TABLE public.battle_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code varchar(6) NOT NULL UNIQUE,
  host_id uuid NOT NULL,
  guest_id uuid,
  status varchar(20) NOT NULL DEFAULT 'waiting',
  level varchar(50) NOT NULL,
  set_no integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rooms" ON public.battle_rooms FOR SELECT USING (true);
CREATE POLICY "Auth users can create" ON public.battle_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants can update" ON public.battle_rooms FOR UPDATE USING (true);

-- 4. profiles 테이블 생성
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self" ON public.profiles FOR ALL USING (auth.uid() = id);

-- 5. user_progress 테이블 생성 (세트 클리어 시스템)
CREATE TABLE public.user_progress (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level         text   NOT NULL,
  set_no        int    NOT NULL,
  success_count int    NOT NULL DEFAULT 0 CHECK (success_count >= 0 AND success_count <= 3),
  is_cleared    boolean NOT NULL DEFAULT false,
  has_medal     boolean NOT NULL DEFAULT false, -- 마스터 챌린지 훈장 획득 여부
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, level, set_no)           -- UPSERT를 위한 복합 유니크
);

CREATE INDEX idx_progress_user ON public.user_progress (user_id, level);
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
-- 본인 데이터만 읽기/쓰기
CREATE POLICY "progress_self_select" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_self_insert" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_self_update" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. 단어 데이터 입력 (DB와 동기화됨: 약 1700개)
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES
  ('word', 'elem_low', 1, 'the', '그', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'and', '~와, ~하고, 그리고', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'for', '~을 위해', '~동안', '~에 대해', NULL),
  ('word', 'elem_low', 1, 'that', '저것, 그것', '~라는 것', NULL, NULL),
  ('word', 'elem_low', 1, 'this', '이것, 이', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'with', '~와 함께', '~을 가지고', NULL, NULL),
  ('word', 'elem_low', 1, 'you', '너, 당신, 너희들', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'not', '~이 아니다, ~않다', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'are', '~이다, ~있다', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'from', '~로부터, ~에서', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'your', '너의, 당신의, 너희들의', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'all', '모든, 전부', '모두, 전부', NULL, NULL),
  ('word', 'elem_low', 1, 'have', '가지다, 가지고 있다', '~해야 한다', '먹다, 마시다', NULL),
  ('word', 'elem_low', 1, 'new', '새로운', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'more', '더 많은, 더', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'was', '~이었다, ~있었다', NULL, NULL, NULL),
  ('word', 'elem_low', 1, 'will', '~할 것이다', '~할 의지가 있다', NULL, NULL),
  ('word', 'elem_low', 1, 'home', '집, 가정', '집으로', NULL, NULL),
  ('word', 'elem_low', 1, 'can', '~할 수 있다', '~해도 좋다', '캔', NULL),
  ('word', 'elem_low', 1, 'about', '~에 대해, ~에 관하여', '약, 대략', NULL, NULL)