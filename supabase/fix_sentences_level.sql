-- ============================================================
-- 예문 수준 교정 SQL
-- 규칙: 예문의 단어 수준은 해당 학년 이하로
-- ============================================================

-- ═══════════════════════════════════════
-- elem_3 (초등 3학년) — 4~7단어, 아주 쉬운 단어만
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'The lion is very big and strong.' WHERE id = 324;
UPDATE words SET example_sentence = 'We laugh at funny things.' WHERE id = 283;
UPDATE words SET example_sentence = 'I was first in the race!' WHERE id = 277;
UPDATE words SET example_sentence = 'I need paper to draw on.' WHERE id = 293;
UPDATE words SET example_sentence = 'I can hear the birds.' WHERE id = 270;
UPDATE words SET example_sentence = 'I want to learn to cook.' WHERE id = 216;
UPDATE words SET example_sentence = 'Let us clap our hands!' WHERE id = 220;
UPDATE words SET example_sentence = 'The north side is cold.' WHERE id = 183;
UPDATE words SET example_sentence = 'This is the best day!' WHERE id = 349;

-- ═══════════════════════════════════════
-- elem_4 (초등 4학년) — 5~9단어, 기초 단어만
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'The birth of the baby made us happy.' WHERE id = 1325;
UPDATE words SET example_sentence = 'She watched a short video about animals.' WHERE id = 1728;
UPDATE words SET example_sentence = 'The body has many bones inside.' WHERE id = 3174;
UPDATE words SET example_sentence = 'The students looked at insects on the trip.' WHERE id = 1771;
UPDATE words SET example_sentence = 'A wild goose flew over the lake.' WHERE id = 1985;
UPDATE words SET example_sentence = 'She scored the best on the math test.' WHERE id = 3060;
UPDATE words SET example_sentence = 'A hobby like painting is fun after school.' WHERE id = 1829;
UPDATE words SET example_sentence = 'Good writing helps you at school.' WHERE id = 988;
UPDATE words SET example_sentence = 'The parrot said the same words back.' WHERE id = 1917;
UPDATE words SET example_sentence = 'The pasta was better with tomato sauce.' WHERE id = 1854;
UPDATE words SET example_sentence = 'She writes ideas in a small notebook.' WHERE id = 1894;
UPDATE words SET example_sentence = 'The doctor used a small needle.' WHERE id = 1926;
UPDATE words SET example_sentence = 'She packed a peanut butter sandwich for lunch.' WHERE id = 1908;
UPDATE words SET example_sentence = 'The lesson I learned is to never give up.' WHERE id = 1886;
UPDATE words SET example_sentence = 'He used an eraser to fix his drawing.' WHERE id = 1674;
UPDATE words SET example_sentence = 'A rainbow came out after the rain.' WHERE id = 1898;

-- ═══════════════════════════════════════
-- elem_5 (초등 5학년) — 5~10단어, 초등 수준 이하
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'Learning new things is always fun.' WHERE id = 943;
UPDATE words SET example_sentence = 'Science is a subject that uses tests.' WHERE id = 992;
UPDATE words SET example_sentence = 'The flame of the candle moved in the wind.' WHERE id = 1660;
UPDATE words SET example_sentence = 'The winner of the contest got a prize.' WHERE id = 1696;
UPDATE words SET example_sentence = 'The restaurant near the beach has good seafood.' WHERE id = 1867;
UPDATE words SET example_sentence = 'The teacher asked us to write one sentence.' WHERE id = 1887;
UPDATE words SET example_sentence = 'Eating vegetables every day keeps you healthy.' WHERE id = 1919;
UPDATE words SET example_sentence = 'The Sahara is a very large, hot desert.' WHERE id = 3191;
UPDATE words SET example_sentence = 'The tide goes up and down twice a day.' WHERE id = 3194;
UPDATE words SET example_sentence = 'The diver found a pretty pearl in a shell.' WHERE id = 1626;
UPDATE words SET example_sentence = 'She checked the mailbox for a letter.' WHERE id = 1833;
UPDATE words SET example_sentence = 'The doctor asked her to weigh herself.' WHERE id = 1971;
UPDATE words SET example_sentence = 'The school hockey team practiced every day.' WHERE id = 2015;
UPDATE words SET example_sentence = 'He quietly left the room to not wake anyone.' WHERE id = 1644;
UPDATE words SET example_sentence = 'Wear a helmet when riding a bike.' WHERE id = 1697;
UPDATE words SET example_sentence = 'Many students like to take online classes.' WHERE id = 1837;
UPDATE words SET example_sentence = 'Good teaching can change how students learn.' WHERE id = 967;
UPDATE words SET example_sentence = 'I like her style of writing.' WHERE id = 1154;
UPDATE words SET example_sentence = 'After a long week, she had time to relax.' WHERE id = 1932;
UPDATE words SET example_sentence = 'The bridge is about three hundred meters long.' WHERE id = 1624;
UPDATE words SET example_sentence = 'Milk and cheese are dairy foods for strong bones.' WHERE id = 1715;
UPDATE words SET example_sentence = 'She wore a silver necklace from her grandma.' WHERE id = 1909;
UPDATE words SET example_sentence = 'She cares deeply about keeping the Earth clean.' WHERE id = 1685;
UPDATE words SET example_sentence = 'The teacher used a magnet to pick up metal.' WHERE id = 1739;
UPDATE words SET example_sentence = 'Today we will talk about the topic of pets.' WHERE id = 1036;
UPDATE words SET example_sentence = 'She brought her laptop to class for notes.' WHERE id = 1724;
UPDATE words SET example_sentence = 'The nurse put a patch on his arm.' WHERE id = 1680;
UPDATE words SET example_sentence = 'The school has a yearly festival for students.' WHERE id = 1727;
UPDATE words SET example_sentence = 'The octopus used its arms to open a jar.' WHERE id = 1627;
UPDATE words SET example_sentence = 'She won a gold medal at the swim meet.' WHERE id = 1669;
UPDATE words SET example_sentence = 'The students helped raise money for others.' WHERE id = 1776;
UPDATE words SET example_sentence = 'In wintertime, the lake turns to ice.' WHERE id = 1907;
UPDATE words SET example_sentence = 'A cactus lives in the desert and holds water.' WHERE id = 1862;
UPDATE words SET example_sentence = 'People use emoji to show feelings in messages.' WHERE id = 1875;
UPDATE words SET example_sentence = 'The ice cream shop has many flavors to try.' WHERE id = 1842;

-- ═══════════════════════════════════════
-- elem_6 (초등 6학년) — 6~11단어, 중등 단어 사용 금지
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'The Amazon rainforest makes a lot of the air we breathe.' WHERE id = 3193;
UPDATE words SET example_sentence = 'She learned how to put on makeup from a video.' WHERE id = 1753;
UPDATE words SET example_sentence = 'Each paragraph should be about one main idea.' WHERE id = 1770;
UPDATE words SET example_sentence = 'The airplane made a smooth landing at the airport.' WHERE id = 1923;
UPDATE words SET example_sentence = 'Spreading gossip about classmates can hurt their feelings.' WHERE id = 1974;
UPDATE words SET example_sentence = 'Eating more food than your body needs makes you gain weight.' WHERE id = 3176;
UPDATE words SET example_sentence = 'Coal has been used for heat and power for a long time.' WHERE id = 3203;
UPDATE words SET example_sentence = 'The police officer directed traffic at the busy road.' WHERE id = 1944;
UPDATE words SET example_sentence = 'A neck massage can help you feel better after a long day.' WHERE id = 1662;
UPDATE words SET example_sentence = 'The helicopter flew over the mountain to save the hikers.' WHERE id = 1690;
UPDATE words SET example_sentence = 'It is unfair to judge people by how they look.' WHERE id = 1695;
UPDATE words SET example_sentence = 'Always read the label on food to check what is inside.' WHERE id = 1676;
UPDATE words SET example_sentence = 'The caterpillar will turn into a butterfly in a few weeks.' WHERE id = 1936;
UPDATE words SET example_sentence = 'Vitamin D from sunlight is good for strong bones.' WHERE id = 3175;
UPDATE words SET example_sentence = 'Doctors today can cure many sicknesses that were once deadly.' WHERE id = 1709;
UPDATE words SET example_sentence = 'Fashion changes every season, but your own style stays.' WHERE id = 1712;
UPDATE words SET example_sentence = 'Good rest and healthy food can stop you from getting sick.' WHERE id = 1748;
UPDATE words SET example_sentence = 'The bad storm knocked down trees and cut the power.' WHERE id = 1777;
UPDATE words SET example_sentence = 'She spent the weekend writing an essay about the Earth.' WHERE id = 1846;
UPDATE words SET example_sentence = 'The price of gasoline went up a lot from last year.' WHERE id = 1820;
UPDATE words SET example_sentence = 'There are billions of stars in our galaxy.' WHERE id = 1743;
UPDATE words SET example_sentence = 'A computer virus can break your files, so be careful.' WHERE id = 1720;
UPDATE words SET example_sentence = 'Pick a strong password with numbers and letters.' WHERE id = 1657;
UPDATE words SET example_sentence = 'Heavy rains caused a big flood and people had to leave.' WHERE id = 3198;
UPDATE words SET example_sentence = 'The musician played a beautiful song for everyone.' WHERE id = 2107;
UPDATE words SET example_sentence = 'We should try to make less garbage to help the Earth.' WHERE id = 1800;
UPDATE words SET example_sentence = 'She has always loved math and wants to be a builder.' WHERE id = 2001;
UPDATE words SET example_sentence = 'She was unable to go to the meeting.' WHERE id = 1747;
UPDATE words SET example_sentence = 'The old kingdom was known for its beautiful castles.' WHERE id = 1693;
UPDATE words SET example_sentence = 'She left her lipstick in the bathroom by mistake.' WHERE id = 1653;
UPDATE words SET example_sentence = 'The office scanner turned the paper into a computer file.' WHERE id = 1804;

-- ═══════════════════════════════════════
-- mid_1 (중등 1학년) — 어휘 수준 초과 + 문장 길이 초과
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'She is a native speaker of Korean and also speaks English well.' WHERE id = 1420;
UPDATE words SET example_sentence = 'The city plans to widen the road to reduce heavy traffic.' WHERE id = 1711;
UPDATE words SET example_sentence = 'The librarian helped us find good books for our project.' WHERE id = 1730;
UPDATE words SET example_sentence = 'Running a marathon needs months of training and strong will.' WHERE id = 1794;
UPDATE words SET example_sentence = 'Climate change is a serious threat to animals and nature.' WHERE id = 1855;
UPDATE words SET example_sentence = 'Some cleaning products can be harmful to people and animals.' WHERE id = 1883;
UPDATE words SET example_sentence = 'The young violinist played beautifully and everyone clapped.' WHERE id = 1922;
UPDATE words SET example_sentence = 'The water filter removes bad things and makes water safe.' WHERE id = 1956;
UPDATE words SET example_sentence = 'The teacher shared a great quote about never giving up.' WHERE id = 2000;
UPDATE words SET example_sentence = 'Students must enroll in the course before the deadline.' WHERE id = 2181;
UPDATE words SET example_sentence = 'The company earned a large profit after selling its new product.' WHERE id = 2235;
UPDATE words SET example_sentence = 'You must get a license before you can drive a car.' WHERE id = 2317;
UPDATE words SET example_sentence = 'The advisor helped students choose the right courses.' WHERE id = 2459;
UPDATE words SET example_sentence = 'Living in harmony with nature takes effort from everyone.' WHERE id = 2505;
UPDATE words SET example_sentence = 'The study revealed the truth behind the problem.' WHERE id = 3033;
UPDATE words SET example_sentence = 'Every living thing is made up of one or more cells.' WHERE id = 3164;
UPDATE words SET example_sentence = 'The body sends signals through nerves to the brain.' WHERE id = 3172;
UPDATE words SET example_sentence = 'Warm ocean currents can greatly affect the weather nearby.' WHERE id = 3195;
UPDATE words SET example_sentence = 'A strong imagination is a great gift for any writer.' WHERE id = 3246;
UPDATE words SET example_sentence = 'Digital technology has changed how we talk, work, and learn.' WHERE id = 3255;
UPDATE words SET example_sentence = 'She made steady progress throughout the school year.' WHERE id = 3280;
UPDATE words SET example_sentence = 'The lifeguard watched the swimmers to make sure they were safe.' WHERE id = 1633;
UPDATE words SET example_sentence = 'She loved to wander through the old streets of the town.' WHERE id = 1640;
UPDATE words SET example_sentence = 'Only the tip of the iceberg was above the water.' WHERE id = 1707;
UPDATE words SET example_sentence = 'She suddenly realized she had left her phone at home.' WHERE id = 1928;
UPDATE words SET example_sentence = 'The company made a profile of their ideal customer.' WHERE id = 2255;
UPDATE words SET example_sentence = 'A mysterious light appeared in the sky one night.' WHERE id = 2282;
UPDATE words SET example_sentence = 'Muscle tissue is made of long fibers that can move.' WHERE id = 3165;

-- ═══════════════════════════════════════
-- mid_2 (중등 2학년) — 1개
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'Battery acid is very dangerous and must be handled carefully.' WHERE id = 3178;

-- ═══════════════════════════════════════
-- mid_3 (중등 3학년) — 고등 어휘 사용 수정
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'Many rare species inhabit the rainforest, which must be protected.' WHERE id = 2080;
UPDATE words SET example_sentence = 'She made a notable contribution to science through her research.' WHERE id = 2093;
UPDATE words SET example_sentence = 'The two paintings looked identical, but experts found small differences.' WHERE id = 2233;
UPDATE words SET example_sentence = 'Animals often defend their territory to protect their food and young.' WHERE id = 2394;
UPDATE words SET example_sentence = 'The university has a selective process that looks at grades and activities.' WHERE id = 2400;
UPDATE words SET example_sentence = 'A flexible schedule helps students balance studies and other activities.' WHERE id = 2511;
UPDATE words SET example_sentence = 'Scientists warn that many species face extinction without protection.' WHERE id = 3297;
UPDATE words SET example_sentence = 'The two research areas overlap, which helps sharing of ideas.' WHERE id = 3299;
UPDATE words SET example_sentence = 'The architect used horizontal lines to make the building look wide.' WHERE id = 3314;
UPDATE words SET example_sentence = 'People were quick to criticize the methods of the study.' WHERE id = 3349;
UPDATE words SET example_sentence = 'Her achievements went far beyond those of the people before her.' WHERE id = 3679;

-- ═══════════════════════════════════════
-- high_1 (고등 1학년) — 문장 축약 + 대학 수준 문맥 수정
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'Students under eighteen are exempt from the full entrance fee.' WHERE id = 3720;
UPDATE words SET example_sentence = 'The merger of the two airlines created a huge company.' WHERE id = 3212;
UPDATE words SET example_sentence = 'A school is an entity with its own culture.' WHERE id = 1713;
UPDATE words SET example_sentence = 'Quantitative data from the survey helped the team find answers.' WHERE id = 2390;
UPDATE words SET example_sentence = 'The team collected empirical data to test their idea.' WHERE id = 2186;
UPDATE words SET example_sentence = 'The project was done in accordance with the rules.' WHERE id = 2253;
UPDATE words SET example_sentence = 'The strong evidence compelled everyone to agree with the decision.' WHERE id = 3569;

-- ═══════════════════════════════════════
-- high_2 (고등 2학년) — 문장 축약 + 격식체 완화
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'To learn a new language, immerse yourself in the culture.' WHERE id = 3783;
UPDATE words SET example_sentence = 'The luminous watch dial was easy to read in the dark.' WHERE id = 3858;
UPDATE words SET example_sentence = 'His inadvertent comment caused an awkward silence in the room.' WHERE id = 3800;
UPDATE words SET example_sentence = 'It would be prudent to save some money for emergencies.' WHERE id = 3944;
UPDATE words SET example_sentence = 'It is incumbent upon every citizen to vote in elections.' WHERE id = 3804;
UPDATE words SET example_sentence = 'The success of the project is contingent upon getting more funds.' WHERE id = 3593;

-- ═══════════════════════════════════════
-- 숙어 — 문법 오류 수정 + 맥락 보강
-- ═══════════════════════════════════════

UPDATE words SET example_sentence = 'By no stretch of the imagination is this fair.' WHERE id = 4452;
UPDATE words SET example_sentence = 'With the factory closing, many jobs are at stake.' WHERE id = 4310;
UPDATE words SET example_sentence = 'The new political movement is gaining ground quickly.' WHERE id = 4440;
UPDATE words SET example_sentence = 'His words about family really hit home for everyone.' WHERE id = 4441;
UPDATE words SET example_sentence = 'Careful deception is his usual modus operandi.' WHERE id = 4552;
