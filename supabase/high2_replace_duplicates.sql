-- ============================================================
-- high_2 중복 단어 34개 교체
-- 각 단어를 DELETE 후 INSERT하여 교체합니다
-- 고2 / 수능 대비 수준의 고급 학술 어휘로 교체
-- ============================================================

-- 1. abolish (set 1) → abdicate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'abolish';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 1, 'abdicate', '(왕위를) 퇴위하다', '(책임을) 포기하다', NULL, 'The king was forced to abdicate the throne after the revolution swept through the country.');

-- 2. altruistic (set 1) → amenable
DELETE FROM public.words WHERE level = 'high_2' AND word = 'altruistic';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 1, 'amenable', '기꺼이 받아들이는', '순응하는', NULL, 'The committee was amenable to the proposed changes after reviewing the supporting evidence.');

-- 3. arbitration (set 2) → antithesis
DELETE FROM public.words WHERE level = 'high_2' AND word = 'arbitration';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 2, 'antithesis', '정반대', '대조', NULL, 'His casual attitude was the antithesis of the discipline expected in a military environment.');

-- 4. baffle (set 3) → belated
DELETE FROM public.words WHERE level = 'high_2' AND word = 'baffle';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 3, 'belated', '뒤늦은', '지각한', NULL, 'She sent a belated birthday card with a heartfelt apology for forgetting the date.');

-- 5. bastion (set 3) → cognizant
DELETE FROM public.words WHERE level = 'high_2' AND word = 'bastion';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 3, 'cognizant', '인식하고 있는', '알고 있는', NULL, 'Leaders must be cognizant of the impact their decisions have on the community.');

-- 6. capacity (set 4) → collateral
DELETE FROM public.words WHERE level = 'high_2' AND word = 'capacity';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 4, 'collateral', '담보', '부수적인', NULL, 'The bank required collateral before approving the large business loan.');

-- 7. combustion (set 5) → complicit
DELETE FROM public.words WHERE level = 'high_2' AND word = 'combustion';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 5, 'complicit', '공모한', '연루된', NULL, 'The investigation revealed that several executives were complicit in the financial fraud scheme.');

-- 8. compile (set 5) → concession
DELETE FROM public.words WHERE level = 'high_2' AND word = 'compile';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 5, 'concession', '양보', '인정', NULL, 'Both sides had to make concessions in order to reach a peaceful agreement.');

-- 9. concede (set 5) → supplant
DELETE FROM public.words WHERE level = 'high_2' AND word = 'concede';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 5, 'supplant', '대체하다', '밀어내다', NULL, 'Digital media has gradually supplanted traditional newspapers as the primary source of information.');

-- 10. connotation (set 6) → contingency
DELETE FROM public.words WHERE level = 'high_2' AND word = 'connotation';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 6, 'contingency', '만일의 사태', '비상사태', NULL, 'The company developed a contingency plan in case the negotiations fell through.');

-- 11. consensus (set 6) → debunk
DELETE FROM public.words WHERE level = 'high_2' AND word = 'consensus';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 6, 'debunk', '폭로하다', '허위임을 밝히다', NULL, 'The scientist worked tirelessly to debunk the widespread myth about vaccines causing illness.');

-- 12. credible (set 7) → contentious
DELETE FROM public.words WHERE level = 'high_2' AND word = 'credible';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 7, 'contentious', '논쟁의 여지가 있는', '다투기 좋아하는', NULL, 'The contentious debate over immigration policy divided the nation along political lines.');

-- 13. daunting (set 7) → derogatory
DELETE FROM public.words WHERE level = 'high_2' AND word = 'daunting';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 7, 'derogatory', '경멸적인', '모욕적인', NULL, 'The journalist was criticized for making derogatory remarks about the minority group.');

-- 14. detain (set 9) → duplicity
DELETE FROM public.words WHERE level = 'high_2' AND word = 'detain';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 9, 'duplicity', '이중성', '표리부동', NULL, 'The politician''s duplicity was revealed when his private statements contradicted his public promises.');

-- 15. discourse (set 9) → emancipate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'discourse';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 9, 'emancipate', '해방하다', '자유롭게 하다', NULL, 'The movement sought to emancipate workers from oppressive labor conditions.');

-- 16. displace (set 10) → extricate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'displace';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 10, 'extricate', '구출하다', '빠져나오게 하다', NULL, 'The firefighters managed to extricate the trapped passengers from the wreckage.');

-- 17. fatigue (set 14) → impunity
DELETE FROM public.words WHERE level = 'high_2' AND word = 'fatigue';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 14, 'impunity', '처벌받지 않음', '면책', NULL, 'The corrupt officials acted with impunity, knowing they would never face prosecution.');

-- 18. fervent (set 14) → inscrutable
DELETE FROM public.words WHERE level = 'high_2' AND word = 'fervent';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 14, 'inscrutable', '불가해한', '헤아릴 수 없는', NULL, 'The diplomat maintained an inscrutable expression throughout the tense negotiations.');

-- 19. fundamental (set 14) → insular
DELETE FROM public.words WHERE level = 'high_2' AND word = 'fundamental';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 14, 'insular', '편협한', '섬의', NULL, 'The insular community was reluctant to accept outside influences or new ideas.');

-- 20. hegemony (set 15) → magnanimity
DELETE FROM public.words WHERE level = 'high_2' AND word = 'hegemony';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 15, 'magnanimity', '관대함', '아량', NULL, 'The leader showed great magnanimity by pardoning his political opponents after the election.');

-- 21. humility (set 16) → meritocracy
DELETE FROM public.words WHERE level = 'high_2' AND word = 'humility';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 16, 'meritocracy', '능력주의', '실력주의 사회', NULL, 'The company prides itself on being a meritocracy where promotions are based solely on performance.');

-- 22. impair (set 16) → obsequious
DELETE FROM public.words WHERE level = 'high_2' AND word = 'impair';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 16, 'obsequious', '아첨하는', '비굴한', NULL, 'The obsequious assistant agreed with everything the boss said, never offering an honest opinion.');

-- 23. indignation (set 17) → acquit
DELETE FROM public.words WHERE level = 'high_2' AND word = 'indignation';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 17, 'acquit', '무죄를 선고하다', '(의무를) 이행하다', NULL, 'The jury decided to acquit the defendant after the key witness changed her testimony.');

-- 24. infer (set 17) → prerogative
DELETE FROM public.words WHERE level = 'high_2' AND word = 'infer';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 17, 'prerogative', '특권', '우선권', NULL, 'It is the manager''s prerogative to decide how the budget should be allocated.');

-- 25. irony (set 18) → promulgate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'irony';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 18, 'promulgate', '공포하다', '널리 알리다', NULL, 'The government decided to promulgate new regulations to protect the environment.');

-- 26. jurisdiction (set 18) → rebuke
DELETE FROM public.words WHERE level = 'high_2' AND word = 'jurisdiction';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 18, 'rebuke', '질책하다', '비난하다', NULL, 'The judge rebuked the lawyer for making inappropriate comments during the trial.');

-- 27. manipulate (set 20) → relinquish
DELETE FROM public.words WHERE level = 'high_2' AND word = 'manipulate';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 20, 'relinquish', '포기하다', '양도하다', NULL, 'The CEO was reluctant to relinquish control of the company he had built from scratch.');

-- 28. monopoly (set 21) → repudiate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'monopoly';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 21, 'repudiate', '부인하다', '거부하다', NULL, 'The government repudiated the accusations of corruption made by the opposition party.');

-- 29. paradigm (set 22) → rescind
DELETE FROM public.words WHERE level = 'high_2' AND word = 'paradigm';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 22, 'rescind', '철회하다', '폐지하다', NULL, 'The university decided to rescind the admission offer after discovering falsified documents.');

-- 30. philanthropy (set 23) → subjugate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'philanthropy';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 23, 'subjugate', '정복하다', '복종시키다', NULL, 'The empire sought to subjugate neighboring nations through military force and political pressure.');

-- 31. prioritize (set 24) → subterfuge
DELETE FROM public.words WHERE level = 'high_2' AND word = 'prioritize';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 24, 'subterfuge', '속임수', '구실', NULL, 'The spy used subterfuge to gain access to the classified documents without being detected.');

-- 32. proliferate (set 24) → superfluous
DELETE FROM public.words WHERE level = 'high_2' AND word = 'proliferate';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 24, 'superfluous', '불필요한', '과잉의', NULL, 'The editor removed all superfluous details from the article to make it more concise.');

-- 33. rhetoric (set 25) → transgress
DELETE FROM public.words WHERE level = 'high_2' AND word = 'rhetoric';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 25, 'transgress', '위반하다', '(도를) 넘다', NULL, 'Those who transgress the boundaries of the law must be held accountable for their actions.');

-- 34. sovereignty (set 25) → vindicate
DELETE FROM public.words WHERE level = 'high_2' AND word = 'sovereignty';
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES ('word', 'high_2', 25, 'vindicate', '(혐의를) 벗기다', '정당성을 입증하다', NULL, 'The new evidence served to vindicate the defendant, proving his innocence beyond any doubt.');
