-- ============================================================
-- mid_1 중복 단어 수정 (curiosity 중복 제거 + 새 단어 추가)
-- ============================================================

-- 1. 중복된 curiosity 중 하나 삭제 (id가 더 큰 것 삭제)
DELETE FROM public.words
WHERE id = (
  SELECT id FROM public.words
  WHERE level = 'mid_1' AND set_no = 6 AND word = 'curiosity'
  ORDER BY id DESC
  LIMIT 1
);

-- 2. 새 단어 추가 (mid_1 set 6)
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence)
VALUES ('word', 'mid_1', 6, 'compliance', '준수', '이행', NULL, 'All employees must ensure compliance with the company safety regulations.');