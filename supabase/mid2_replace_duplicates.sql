-- ============================================================
-- mid_2 중복 단어 15개 교체
-- 각 단어를 DELETE 후 INSERT하여 교체합니다
-- 중2 수준에 적합한 실용 어휘로 교체
-- ============================================================

-- 1. brilliant (set 28) → backpack
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'brilliant';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'backpack', '배낭', '책가방', NULL, 'I packed my backpack with books and a water bottle before going to school.');

-- 2. carbon (set 28) → cabinet
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'carbon';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'cabinet', '캐비닛', '수납장', NULL, 'She put the dishes back in the kitchen cabinet after washing them.');

-- 3. ceremony (set 28) → curtain
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'ceremony';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'curtain', '커튼', '장막', NULL, 'Please close the curtain so the sunlight does not come into the room.');

-- 4. continent (set 28) → drawer
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'continent';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'drawer', '서랍', NULL, NULL, 'I keep my socks and gloves in the top drawer of my desk.');

-- 5. creature (set 28) → grocery
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'creature';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'grocery', '식료품', '식료품점', NULL, 'My mom asked me to go to the grocery store and buy some milk.');

-- 6. extinct (set 28) → fountain
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'extinct';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'fountain', '분수', '분수대', NULL, 'The children played near the fountain in the park on a hot summer day.');

-- 7. forecast (set 28) → hiking
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'forecast';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'hiking', '등산', '하이킹', NULL, 'We went hiking in the mountains last weekend and enjoyed the fresh air.');

-- 8. freedom (set 28) → jewelry
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'freedom';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'jewelry', '보석류', '장신구', NULL, 'She received a beautiful piece of jewelry as a birthday gift from her grandmother.');

-- 9. merchant (set 28) → napkin
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'merchant';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'napkin', '냅킨', '식탁용 종이', NULL, 'He wiped his hands with a napkin after eating the fried chicken.');

-- 10. obligation (set 28) → pillow
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'obligation';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'pillow', '베개', NULL, NULL, 'I need a soft pillow to sleep well at night.');

-- 11. oxygen (set 28) → puzzle
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'oxygen';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'puzzle', '퍼즐', '수수께끼', NULL, 'It took me three hours to finish the 500-piece puzzle.');

-- 12. parliament (set 24) → scissors
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'parliament';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 24, 'scissors', '가위', NULL, NULL, 'Can I borrow your scissors to cut this paper?');

-- 13. portrait (set 28) → shelf
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'portrait';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'shelf', '선반', '책꽂이', NULL, 'He put the new books on the top shelf in his room.');

-- 14. poverty (set 28) → sunset
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'poverty';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'sunset', '일몰', '해질녘', NULL, 'We watched the beautiful sunset from the beach together.');

-- 15. symptom (set 28) → throat
DELETE FROM public.words WHERE level = 'mid_2' AND word = 'symptom';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'mid_2', 28, 'throat', '목', '목구멍', NULL, 'I have a sore throat, so it is hard to swallow food today.');
