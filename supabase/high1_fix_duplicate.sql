-- ============================================================
-- high_1 중복 단어 14개 교체 (DELETE + INSERT)
-- 기존 다른 레벨과 중복되는 고급 단어를 고1 수준에 맞는 새 단어로 교체
-- ============================================================

-- 1. controversial (set 22) → circumvent
DELETE FROM public.words WHERE level = 'high_1' AND word = 'controversial';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 22, 'circumvent', '우회하다', '회피하다', NULL, 'The company tried to circumvent the regulations by setting up operations overseas.');

-- 2. credible (set 21) → contradict
DELETE FROM public.words WHERE level = 'high_1' AND word = 'credible';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'contradict', '모순되다', '반박하다', NULL, 'The new evidence seemed to contradict the original theory proposed by the researchers.');

-- 3. criteria (set 21) → coexist
DELETE FROM public.words WHERE level = 'high_1' AND word = 'criteria';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'coexist', '공존하다', '함께 존재하다', NULL, 'Different cultures can coexist peacefully when people respect each other''s traditions.');

-- 4. discourse (set 21) → disperse
DELETE FROM public.words WHERE level = 'high_1' AND word = 'discourse';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'disperse', '흩어지다', '분산시키다', NULL, 'The police asked the crowd to disperse after the protest ended peacefully.');

-- 5. dominate (set 21) → excavate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'dominate';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'excavate', '발굴하다', '굴착하다', NULL, 'Archaeologists began to excavate the ancient ruins to learn more about the lost civilization.');

-- 6. equity (set 21) → necessitate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'equity';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'necessitate', '필요로 하다', '불가피하게 하다', NULL, 'The sudden increase in students will necessitate the construction of a new classroom building.');

-- 7. inference (set 21) → obstruct
DELETE FROM public.words WHERE level = 'high_1' AND word = 'inference';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'obstruct', '방해하다', '막다', NULL, 'Fallen trees obstructed the road, making it impossible for cars to pass through.');

-- 8. manipulate (set 21) → inaugurate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'manipulate';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'inaugurate', '취임시키다', '개시하다', NULL, 'The city plans to inaugurate the new public library with a special ceremony next month.');

-- 9. metaphor (set 22) → transcend
DELETE FROM public.words WHERE level = 'high_1' AND word = 'metaphor';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 22, 'transcend', '초월하다', '뛰어넘다', NULL, 'Great works of art have the power to transcend cultural and language barriers.');

-- 10. paradigm (set 22) → congregate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'paradigm';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 22, 'congregate', '모이다', '집합하다', NULL, 'Students often congregate in the cafeteria during lunch break to chat with their friends.');

-- 11. propaganda (set 21) → proclaim
DELETE FROM public.words WHERE level = 'high_1' AND word = 'propaganda';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'proclaim', '선언하다', '공표하다', NULL, 'The president proclaimed a national day of mourning after the devastating earthquake.');

-- 12. rationalize (set 21) → implicate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'rationalize';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'implicate', '연루시키다', '관련짓다', NULL, 'The new evidence could implicate several officials in the corruption scandal.');

-- 13. rhetoric (set 21) → subordinate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'rhetoric';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'subordinate', '하위의', '종속시키다', NULL, 'In the military, a subordinate officer must follow the orders given by a superior.');

-- 14. stimulate (set 21) → postulate
DELETE FROM public.words WHERE level = 'high_1' AND word = 'stimulate';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'high_1', 21, 'postulate', '가정하다', '공리로 삼다', NULL, 'The scientist postulated that the disease was caused by a previously unknown virus.');
