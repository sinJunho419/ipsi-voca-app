-- ══════════════════════════════════════════════════════
-- ipsinavi_Login_info 중심 사용자 관리 마이그레이션
-- 모든 테이블이 ipsinavi_Login_info.id (bigint)를 참조
-- ══════════════════════════════════════════════════════

-- ── 0. 기존 sso_tokens 제거 ──
DROP TABLE IF EXISTS public.sso_tokens CASCADE;

-- ── 1. ipsinavi_Login_info (중앙 사용자 테이블) ──
CREATE TABLE IF NOT EXISTS public."ipsinavi_Login_info" (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "UserNID" int NOT NULL,
    "UserName" varchar(200) NOT NULL,
    "NsiteID" int,                            -- 학원코드
    "Scomment" varchar(200),                  -- 학원명
    supabase_uid uuid UNIQUE,                 -- auth.users UUID 브릿지
    status text NOT NULL DEFAULT 'active',    -- active / inactive
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 hours'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("UserNID")
);

CREATE INDEX IF NOT EXISTS idx_ipsinavi_login_usernid
    ON public."ipsinavi_Login_info" ("UserNID");
CREATE INDEX IF NOT EXISTS idx_ipsinavi_login_supabase_uid
    ON public."ipsinavi_Login_info" (supabase_uid);

ALTER TABLE public."ipsinavi_Login_info" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only"
    ON public."ipsinavi_Login_info" FOR ALL TO service_role USING (true);

-- ── 2. profiles (ipsinavi_Login_info.id 참조) ──
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
    id bigint PRIMARY KEY REFERENCES public."ipsinavi_Login_info"(id) ON DELETE CASCADE,
    name text,
    status char(1) NOT NULL DEFAULT '0',      -- 0: 사용중 / 1: 정지
    "NsiteID" int,                            -- 학원코드
    "Scomment" varchar(200),                  -- 학원명
    academy_id text,                          -- 소속 학원 ID (레거시 호환)
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
    id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);
CREATE POLICY "profiles_select_academy" ON public.profiles FOR SELECT USING (
    "NsiteID" = (SELECT "NsiteID" FROM public.profiles WHERE id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid()))
);

-- ── 3. wrong_answers (ipsinavi_Login_info.id 참조) ──
DROP TABLE IF EXISTS public.wrong_answers CASCADE;
CREATE TABLE public.wrong_answers (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES public."ipsinavi_Login_info"(id) ON DELETE CASCADE,
    word_id bigint NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    wrong_count int NOT NULL DEFAULT 1,
    consecutive_correct int NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'Learning',
    last_wrong_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, word_id),
    CONSTRAINT chk_wrong_answers_status CHECK (status IN ('Learning', 'Mastered'))
);

CREATE INDEX idx_wrong_answers_user ON public.wrong_answers (user_id);
CREATE INDEX idx_wrong_answers_status ON public.wrong_answers (user_id, status);

ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrong_answers_select" ON public.wrong_answers FOR SELECT USING (
    user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);
CREATE POLICY "wrong_answers_insert" ON public.wrong_answers FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);
CREATE POLICY "wrong_answers_update" ON public.wrong_answers FOR UPDATE USING (
    user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);
CREATE POLICY "wrong_answers_delete" ON public.wrong_answers FOR DELETE USING (
    user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);

-- ── 4. battle_rooms (bigint 참조) ──
DROP TABLE IF EXISTS public.battle_rooms CASCADE;
CREATE TABLE public.battle_rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code varchar(6) NOT NULL UNIQUE,
    host_id bigint NOT NULL REFERENCES public."ipsinavi_Login_info"(id),
    participant_ids bigint[] DEFAULT '{}',
    max_players integer DEFAULT 50,
    status varchar(20) NOT NULL DEFAULT 'waiting',
    level varchar(50) NOT NULL,
    set_no integer NOT NULL,
    mode text NOT NULL DEFAULT 'normal',
    question_count integer,
    question_ids integer[],
    finished_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rooms" ON public.battle_rooms FOR SELECT USING (true);
CREATE POLICY "Auth users can create" ON public.battle_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants can update" ON public.battle_rooms FOR UPDATE USING (true);
CREATE POLICY "Participants can delete" ON public.battle_rooms FOR DELETE USING (true);

-- ── 5. battle_history (bigint 참조) ──
DROP TABLE IF EXISTS public.battle_history CASCADE;
CREATE TABLE public.battle_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid,
    participants_ids bigint[] NOT NULL,
    scores jsonb NOT NULL,         -- { "login_info_id": score }
    winner_id bigint,
    wrong_words jsonb,             -- { "login_info_id": [word_id, ...] }
    "NsiteID" int,                 -- 학원코드 (피드용)
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.battle_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_history_nsite_select" ON public.battle_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public."ipsinavi_Login_info" li ON li.id = p.id
            WHERE li.supabase_uid = auth.uid()
              AND p."NsiteID" = battle_history."NsiteID"
        )
    );
CREATE POLICY "battle_history_insert" ON public.battle_history
    FOR INSERT WITH CHECK (true);

-- ── 6. activity_log (학습/테스트/마스터 챌린지 완료 기록) ──
DROP TABLE IF EXISTS public.activity_log CASCADE;
CREATE TABLE public.activity_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES public."ipsinavi_Login_info"(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    level varchar(50) NOT NULL,
    set_no integer NOT NULL,
    set_type text NOT NULL DEFAULT 'word',
    score integer,
    total integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_activity_type CHECK (activity_type IN ('study_complete', 'quiz_complete', 'master_complete'))
);

CREATE INDEX idx_activity_log_user ON public.activity_log (user_id, created_at DESC);
CREATE INDEX idx_activity_log_user_type ON public.activity_log (user_id, activity_type, created_at);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT USING (
    user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);
CREATE POLICY "activity_log_select_academy" ON public.activity_log FOR SELECT USING (
    user_id IN (
        SELECT p.id FROM public.profiles p
        WHERE p."NsiteID" = (
            SELECT p2."NsiteID" FROM public.profiles p2
            JOIN public."ipsinavi_Login_info" li ON li.id = p2.id
            WHERE li.supabase_uid = auth.uid()
        )
    )
);
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
);

-- ── 7. weekly_reports (bigint 참조) ──
DROP TABLE IF EXISTS public.weekly_reports CASCADE;
CREATE TABLE public.weekly_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES public."ipsinavi_Login_info"(id),
    week_start date NOT NULL,
    total_battles integer NOT NULL DEFAULT 0,
    win_rate numeric(5,1) NOT NULL DEFAULT 0,
    mastered_count integer NOT NULL DEFAULT 0,
    top_rival_id bigint,
    daily_activity jsonb NOT NULL DEFAULT '{}',
    "NsiteID" int,                 -- 학원코드
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_reports_user ON public.weekly_reports (user_id, week_start DESC);
CREATE INDEX idx_weekly_reports_nsite ON public.weekly_reports ("NsiteID", week_start);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_reports_select" ON public.weekly_reports
    FOR SELECT USING (
        user_id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
        OR "NsiteID" = (
            SELECT "NsiteID" FROM public.profiles
            WHERE id = (SELECT id FROM public."ipsinavi_Login_info" WHERE supabase_uid = auth.uid())
        )
    );


-- ══════════════════════════════════════════════════════
-- RPC 함수 (모두 bigint user_id 사용)
-- ══════════════════════════════════════════════════════

-- 오답 기록 (1건)
CREATE OR REPLACE FUNCTION public.increment_wrong_answer(u_id bigint, w_id bigint)
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

-- 오답 기록 (다수)
CREATE OR REPLACE FUNCTION record_wrong_words(p_user_id bigint, p_word_ids integer[])
RETURNS void AS $$
DECLARE wid integer;
BEGIN
    FOREACH wid IN ARRAY p_word_ids LOOP
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

-- 리벤지 정답
CREATE OR REPLACE FUNCTION record_revenge_correct(p_user_id bigint, p_word_id integer)
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
        UPDATE public.wrong_answers SET status = 'Mastered'
        WHERE user_id = p_user_id AND word_id = p_word_id;
        new_status := 'Mastered';
    ELSE
        new_status := 'Learning';
    END IF;
    RETURN new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 리벤지 오답
CREATE OR REPLACE FUNCTION record_revenge_wrong(p_user_id bigint, p_word_id integer)
RETURNS void AS $$
BEGIN
    UPDATE public.wrong_answers
    SET consecutive_correct = 0,
        wrong_count = wrong_count + 1,
        last_wrong_at = now()
    WHERE user_id = p_user_id AND word_id = p_word_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 배틀 입장 (bigint user_id)
CREATE OR REPLACE FUNCTION join_battle_room(p_room_id uuid, p_user_id bigint)
RETURNS boolean AS $$
DECLARE rows_affected integer;
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

-- 배틀 퇴장 + 방장 위임
CREATE OR REPLACE FUNCTION leave_battle_room(p_room_id uuid, p_user_id bigint)
RETURNS void AS $$
DECLARE
    current_host bigint;
    remaining bigint[];
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

-- 상대 전적
CREATE OR REPLACE FUNCTION get_h2h_stats(my_id bigint, opponent_id bigint)
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

-- 배틀 오답 자동 동기화 트리거
CREATE OR REPLACE FUNCTION sync_wrong_words_from_battle()
RETURNS TRIGGER AS $$
DECLARE
    uid text;
    wids jsonb;
    wid integer;
BEGIN
    IF NEW.wrong_words IS NULL THEN RETURN NEW; END IF;

    FOR uid, wids IN SELECT * FROM jsonb_each(NEW.wrong_words) LOOP
        FOR wid IN SELECT jsonb_array_elements_text(wids)::integer LOOP
            INSERT INTO public.wrong_answers (user_id, word_id, wrong_count, consecutive_correct, status, last_wrong_at)
            VALUES (uid::bigint, wid, 1, 0, 'Learning', now())
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

DROP TRIGGER IF EXISTS trg_sync_wrong_words ON public.battle_history;
CREATE TRIGGER trg_sync_wrong_words
    AFTER INSERT ON public.battle_history
    FOR EACH ROW EXECUTE FUNCTION sync_wrong_words_from_battle();

-- 주간 리포트 생성
CREATE OR REPLACE FUNCTION generate_weekly_reports(p_week_start date DEFAULT NULL)
RETURNS integer AS $$
DECLARE
    ws date; we date; report_count integer := 0;
    uid bigint; v_total integer; v_wins integer;
    v_mastered integer; v_rival bigint; v_daily jsonb; v_nsite int;
BEGIN
    IF p_week_start IS NULL THEN
        ws := (date_trunc('week', CURRENT_DATE) - interval '7 days')::date;
    ELSE ws := p_week_start;
    END IF;
    we := ws + interval '7 days';

    FOR uid IN
        SELECT DISTINCT unnest(participants_ids) FROM battle_history
        WHERE created_at >= ws AND created_at < we
    LOOP
        SELECT COUNT(*) INTO v_total FROM battle_history
        WHERE created_at >= ws AND created_at < we AND uid = ANY(participants_ids);

        SELECT COUNT(*) INTO v_wins FROM battle_history
        WHERE created_at >= ws AND created_at < we AND winner_id = uid;

        SELECT COUNT(*) INTO v_mastered FROM wrong_answers
        WHERE user_id = uid AND status = 'Mastered';

        SELECT opponent INTO v_rival FROM (
            SELECT unnest(participants_ids) as opponent FROM battle_history
            WHERE created_at >= ws AND created_at < we AND uid = ANY(participants_ids)
        ) sub WHERE opponent != uid GROUP BY opponent ORDER BY COUNT(*) DESC LIMIT 1;

        SELECT COALESCE(jsonb_object_agg(dow, cnt), '{}'::jsonb) INTO v_daily FROM (
            SELECT EXTRACT(ISODOW FROM created_at)::text as dow, COUNT(*) as cnt
            FROM battle_history WHERE created_at >= ws AND created_at < we
            AND uid = ANY(participants_ids) GROUP BY EXTRACT(ISODOW FROM created_at)
        ) sub;

        SELECT "NsiteID" INTO v_nsite FROM profiles WHERE id = uid;

        INSERT INTO weekly_reports (user_id, week_start, total_battles, win_rate, mastered_count, top_rival_id, daily_activity, "NsiteID")
        VALUES (uid, ws, v_total, CASE WHEN v_total > 0 THEN ROUND(v_wins::numeric / v_total * 100, 1) ELSE 0 END,
                v_mastered, v_rival, v_daily, v_nsite)
        ON CONFLICT (user_id, week_start) DO UPDATE SET
            total_battles = EXCLUDED.total_battles, win_rate = EXCLUDED.win_rate,
            mastered_count = EXCLUDED.mastered_count, top_rival_id = EXCLUDED.top_rival_id,
            daily_activity = EXCLUDED.daily_activity, "NsiteID" = EXCLUDED."NsiteID";

        report_count := report_count + 1;
    END LOOP;
    RETURN report_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public."ipsinavi_Login_info" IS '입시내비 연동 회원 정보 관리 (중앙 사용자 테이블)';
