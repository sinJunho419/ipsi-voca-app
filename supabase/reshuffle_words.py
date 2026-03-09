"""
3000 단어를 난이도별로 재분류하여 학년에 맞게 배치하고,
각 세트를 20개씩 균등 배분하는 스크립트.

레벨별 목표:
  elem_3: 9세트 (180개)   elem_4: 10세트 (200개)
  elem_5: 11세트 (220개)  elem_6: 10세트 (200개)
  mid_1: 20세트 (400개)   mid_2: 20세트 (400개)
  mid_3: 20세트 (400개)
  high_1: 25세트 (500개)  high_2: 25세트 (500개)
  합계: 150세트, 3000개
"""
import json, os, re

tmpdir = r'C:\Users\PC\AppData\Local\Temp'
outdir = r'C:\Users\PC\OneDrive\Desktop\words\supabase'

with open(os.path.join(tmpdir, 'all_3000.json'), 'r', encoding='utf-8') as f:
    data = json.load(f)

# ── 난이도 점수 산출 ──────────────────────────────────────
# 초등 기본 단어 (빈도 매우 높은 일상 단어)
ELEM_CORE = set("""
a about after again all also am an and any are as at back bad be because
been before best better big black blue body book both boy bring but buy by
call came can car cat city class clean close cold come cool could country
cut dad dark day did do does dog done door down draw drink drive dry each
early earth east eat end even every eye face fall family far fast father
feel few find first fish five fly food foot for four friend from front
full fun game get girl give go going good got great green ground grow
had hair half hand happy hard has have he head hear help her here high
him his hold home hope hot house how hundred i if in into is it its job
just keep kid kind king know land large last late learn left let life
light like line little live long look lot love low lunch made make man
many may me milk mind miss mom money month more morning most mother move
much music must my name near need new next nice night no north not now
number of off oh ok old on once one only open or other our out outside
over own page pair paper park part pass people pick place plan plant play
please point pull push put question rain ran read real red remember right
river room run sad said same sat saw say school sea see she short should
show side sit six sleep small so some song soon south stand star start
stay still stop story street strong student sun sure swim table take talk
tell ten than thank that the their them then there these they thing think
this three through time to today together too top town tree turn two
under until up upon us use very wait walk want warm was watch water way
we week well went were west what when where which white who why will
wind with woman won word work world would write year yes yet you young
""".split())

# 중등 기본 단어 (중학교 필수 어휘)
MID_CORE = set("""
ability accept accident achieve across action actually add address admit
advantage advice afford afraid agree ahead allow almost alone along already
although among amount ancient angry announce anyway apartment appear apply
approach area argue army arrange arrive article artist attack attempt
attention attract audience available average avoid award aware balance
base basic battle beach bear beat became become beginning behavior
belong beside beyond billion bit blank blind block blood blow board
bomb bone border born borrow boss brave breath bridge brief bright
broad broken build burn bury bus business busy calm camp capital captain
carbon careful carry case catch cause celebrate center century certain
chain challenge chance chapter cheap check choice choose circle citizen
claim climb clothes coach coast code coffee collect college combine
comfortable common communicate community company compare complete
computer concern condition connect consider contact contain continue
control conversation cook corner correct cost cotton count couple
courage cover crash create crime cross crowd culture cup current
customer damage danger dead deal debate decide decision deep degree
deliver demand department depend describe design desire detail
determine develop dialogue die difference difficult dig digital dinner
direction disappear discover discuss distance divide dollar doubt
dozen drama draw dream dress drop during dust earn economy edge
education effect effort either election electronic element
embarrass emergency emotion employ empty encourage enemy energy engine
enjoy enough enter entire environment equal escape especially
establish estimate evaluate event eventually evidence exact examine
example excellent except exchange excite exercise exist expect
expensive experience explain express extra extreme fail fair familiar
fan fear feature feed field fight fill final find finger fit fix flag
flat flight floor flow focus follow force foreign forest forever forget
form forward found fresh frighten fuel gap gather general generation
gentle gift glad global gold grab grade gradually grain grand gray grew
guard guess guide gun guy handle hang happen harm hat hate heat heavy
herself himself hire history hit hole honest honor huge human humor hunt
hurry hurt husband ice identify ignore imagine immediately impact
import impossible improve include increase independent indicate
industry influence information injure inner innocent insect inside
instead intelligence interest interview introduce invent investigate
invite involve iron island issue item join joke journey joy judge jump
junior key kick knee knife knock label lack lay lead leader league
lesson level library lift link liquid list listen load local location
lock lonely lord loss luck mad magazine main maintain major manage mark
market marriage match material matter meal meaning measure media medical
meet member memory mental message method middle military million
minor minute mirror mistake mix model modern moment moral movement
murder mystery narrow nation natural nearly necessary neighbor neither
network noise none normal note notice novel nuclear nurse object observe
obvious occur ocean officer official oil operate opinion orange order
ordinary organize origin otherwise ought pain painting pair pattern
pause peace perform perhaps period personal pet phone phrase physical
pilot planet pleasure plenty pocket poem politics pool popular position
positive possible pour powerful practice prefer prepare present president
prevent price prison private probably produce professor profit program
project promise protect prove provide public pull purchase push quality
quarter quick quiet race radio raise range rapidly rare rate rather
reach react realize receive recent recognize recommend record reduce
refer reflect region regular reject relate relationship release remain
remarkable remove rent repeat replace report represent request require
research resource respect respond rest result retire reveal review
revolution rice ride risk role root rope rough row royal rule rush
safety sail sample sand scared scene schedule screen search season seat
secret section seek seem select senior sense separate serious serve
service settle several severe shake shall shape share sharp sheet shift
shine ship shock shoot shoulder sight signal silence silly silver
similar simple since single sir sister site skin slave slight smart
smell smooth snow social soil soldier solution somewhere source southern
spare specific speech speed spirit spread spring square stage standard
state station steal step stick stomach storm straight strange stream
stress stretch strike string struggle stuff style subject succeed
success suffer suggest suit supply suppose surface surprise surround
survive suspect sweet technology terrible text thick thin threat tie
tight tiny title tone total touch tough tour toward tower track trade
traffic train transport travel treat trip trouble trust truth twice
typical ugly unable uncle unique unit universe unless unlikely upper
upset urban used useful usual valley vast version victim violence
virtual visit voice volume wage warn warn waste weak wealth weapon
weather weigh welcome wheel whenever whether whom whose widely willing
wing winter wire wish within wonder wooden worth youth zone
""".split())

def difficulty_score(word):
    """단어 난이도 점수 (낮을수록 쉬움)"""
    w = word.lower().strip()
    score = 0.0

    # 1) 기본 단어 사전 체크
    if w in ELEM_CORE:
        return 0.5 + len(w) * 0.01  # 매우 쉬움
    if w in MID_CORE:
        return 2.0 + len(w) * 0.02  # 중간

    # 2) 글자 수 (길수록 어려움)
    score += len(w) * 0.3

    # 3) 음절 수 추정
    vowels = sum(1 for c in w if c in 'aeiouy')
    score += vowels * 0.2

    # 4) 접미사로 난이도 판별
    easy_suffixes = ['ly', 'er', 'ed', 'ing', 'ful', 'less', 'ness', 'ment', 'tion', 'able']
    hard_suffixes = ['ious', 'eous', 'uous', 'ence', 'ance', 'ity', 'ive', 'ous', 'ism', 'ist']
    very_hard_suffixes = ['ulent', 'acious', 'itious', 'monious', 'quitous']

    for s in very_hard_suffixes:
        if w.endswith(s):
            score += 2.0
            break
    for s in hard_suffixes:
        if w.endswith(s):
            score += 1.0
            break
    for s in easy_suffixes:
        if w.endswith(s):
            score -= 0.3
            break

    # 5) 자주 쓰이는 짧은 단어 보정
    if len(w) <= 4:
        score -= 1.5
    elif len(w) <= 6:
        score -= 0.5

    # 6) 라틴/그리스어 어근 (학술적 = 어려움)
    academic_markers = ['ph', 'psych', 'chron', 'graph', 'scrib', 'ject', 'dict',
                        'cede', 'cess', 'clud', 'struct', 'rupt', 'spec', 'port',
                        'duc', 'tract', 'fic', 'mort', 'voc', 'loc', 'cogn',
                        'sequ', 'gress', 'vert', 'plic', 'quir']
    for marker in academic_markers:
        if marker in w:
            score += 0.5
            break

    return max(score, 0.1)

# ── 모든 단어 점수 계산 & 정렬 ─────────────────────────────
for d in data:
    d['score'] = difficulty_score(d['word'])

data.sort(key=lambda d: (d['score'], d['word']))

# ── 레벨별 배분 ──────────────────────────────────────────
LEVELS = [
    ('elem_3', 9),   # 180
    ('elem_4', 10),  # 200
    ('elem_5', 11),  # 220
    ('elem_6', 10),  # 200
    ('mid_1',  20),  # 400
    ('mid_2',  20),  # 400
    ('mid_3',  20),  # 400
    ('high_1', 25),  # 500
    ('high_2', 25),  # 500
]

idx = 0
updates = []
for level, num_sets in LEVELS:
    count = num_sets * 20
    for set_no in range(1, num_sets + 1):
        for j in range(20):
            d = data[idx]
            new_level = level
            new_set = set_no
            if d['level'] != new_level or d['set_no'] != new_set:
                updates.append((d['id'], new_level, new_set))
            idx += 1

print("Total words assigned: %d" % idx)
print("Updates needed: %d" % len(updates))

# ── SQL 생성 ─────────────────────────────────────────────
sql_lines = []
sql_lines.append('-- ============================================================')
sql_lines.append('-- 전체 단어 레벨 & 세트 재배치 (난이도 기준)')
sql_lines.append('-- 모든 세트 20개씩, 학년 수준에 맞게 재분류')
sql_lines.append('-- ============================================================')
sql_lines.append('')

# Batch updates by level for efficiency
for level, num_sets in LEVELS:
    sql_lines.append('-- === %s (%d세트, %d개) ===' % (level, num_sets, num_sets * 20))

# Generate individual UPDATE statements
for wid, new_level, new_set in updates:
    sql_lines.append(
        "UPDATE public.words SET level = '%s', set_no = %d WHERE id = %d;"
        % (new_level, new_set, wid)
    )

sql_lines.append('')
sql_lines.append('-- Done: %d updates' % len(updates))

outpath = os.path.join(outdir, 'reshuffle_all.sql')
with open(outpath, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print("SQL saved to: reshuffle_all.sql")
print("SQL statements: %d" % len(updates))

# ── 결과 미리보기 ─────────────────────────────────────────
idx = 0
for level, num_sets in LEVELS:
    count = num_sets * 20
    words_in_level = data[idx:idx+count]
    sample = [d['word'] for d in words_in_level[:5]]
    sample_end = [d['word'] for d in words_in_level[-5:]]
    scores = [d['score'] for d in words_in_level]
    print("\n%s (%d sets, %d words):" % (level, num_sets, count))
    print("  Score range: %.2f ~ %.2f" % (min(scores), max(scores)))
    print("  First 5: %s" % ', '.join(sample))
    print("  Last 5:  %s" % ', '.join(sample_end))
    idx += count
