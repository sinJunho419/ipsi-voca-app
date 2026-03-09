-- ============================================================
-- 전체 레벨 수정 SQL
-- 초등~고등 수준 부적합 단어 레벨 재배치 + GRE 단어 교체
-- ============================================================

-- === elem_3↔elem_4 스왑 (17쌍) ===

UPDATE public.words SET level = 'elem_4' WHERE id = 1195;  -- care
UPDATE public.words SET level = 'elem_4' WHERE id = 528;  -- catch
UPDATE public.words SET level = 'elem_4' WHERE id = 240;  -- deep
UPDATE public.words SET level = 'elem_4' WHERE id = 253;  -- dirty
UPDATE public.words SET level = 'elem_4' WHERE id = 212;  -- dream
UPDATE public.words SET level = 'elem_4' WHERE id = 377;  -- empty
UPDATE public.words SET level = 'elem_4' WHERE id = 462;  -- floor
UPDATE public.words SET level = 'elem_4' WHERE id = 364;  -- gold
UPDATE public.words SET level = 'elem_4' WHERE id = 281;  -- half
UPDATE public.words SET level = 'elem_4' WHERE id = 275;  -- heart
UPDATE public.words SET level = 'elem_4' WHERE id = 376;  -- high
UPDATE public.words SET level = 'elem_4' WHERE id = 366;  -- hope
UPDATE public.words SET level = 'elem_4' WHERE id = 259;  -- kind
UPDATE public.words SET level = 'elem_4' WHERE id = 236;  -- leave
UPDATE public.words SET level = 'elem_4' WHERE id = 269;  -- queen
UPDATE public.words SET level = 'elem_4' WHERE id = 3124;  -- seed
UPDATE public.words SET level = 'elem_4' WHERE id = 482;  -- wild

UPDATE public.words SET level = 'elem_3' WHERE id = 147;  -- banana
UPDATE public.words SET level = 'elem_3' WHERE id = 84;  -- family
UPDATE public.words SET level = 'elem_3' WHERE id = 109;  -- father
UPDATE public.words SET level = 'elem_3' WHERE id = 106;  -- flower
UPDATE public.words SET level = 'elem_3' WHERE id = 19;  -- friend
UPDATE public.words SET level = 'elem_3' WHERE id = 156;  -- listen
UPDATE public.words SET level = 'elem_3' WHERE id = 24;  -- morning
UPDATE public.words SET level = 'elem_3' WHERE id = 46;  -- mother
UPDATE public.words SET level = 'elem_3' WHERE id = 116;  -- nurse
UPDATE public.words SET level = 'elem_3' WHERE id = 321;  -- orange
UPDATE public.words SET level = 'elem_3' WHERE id = 169;  -- pencil
UPDATE public.words SET level = 'elem_3' WHERE id = 25;  -- please
UPDATE public.words SET level = 'elem_3' WHERE id = 88;  -- school
UPDATE public.words SET level = 'elem_3' WHERE id = 40;  -- sister
UPDATE public.words SET level = 'elem_3' WHERE id = 58;  -- sorry
UPDATE public.words SET level = 'elem_3' WHERE id = 51;  -- speak
UPDATE public.words SET level = 'elem_3' WHERE id = 98;  -- student

-- === elem_4↔elem_5 스왑 (7쌍) ===

UPDATE public.words SET level = 'elem_5' WHERE id = 547;  -- across
UPDATE public.words SET level = 'elem_5' WHERE id = 864;  -- agree
UPDATE public.words SET level = 'elem_5' WHERE id = 344;  -- alone
UPDATE public.words SET level = 'elem_5' WHERE id = 327;  -- become
UPDATE public.words SET level = 'elem_5' WHERE id = 884;  -- choose
UPDATE public.words SET level = 'elem_5' WHERE id = 279;  -- danger
UPDATE public.words SET level = 'elem_5' WHERE id = 452;  -- double

UPDATE public.words SET level = 'elem_4' WHERE id = 30;  -- birthday
UPDATE public.words SET level = 'elem_4' WHERE id = 229;  -- breakfast
UPDATE public.words SET level = 'elem_4' WHERE id = 189;  -- calendar
UPDATE public.words SET level = 'elem_4' WHERE id = 181;  -- colorful
UPDATE public.words SET level = 'elem_4' WHERE id = 70;  -- hospital
UPDATE public.words SET level = 'elem_4' WHERE id = 105;  -- mountain
UPDATE public.words SET level = 'elem_4' WHERE id = 235;  -- umbrella

-- === elem_5↔elem_6 스왑 (18쌍) ===

UPDATE public.words SET level = 'elem_6' WHERE id = 491;  -- belong
UPDATE public.words SET level = 'elem_6' WHERE id = 468;  -- blood
UPDATE public.words SET level = 'elem_6' WHERE id = 404;  -- brain
UPDATE public.words SET level = 'elem_6' WHERE id = 479;  -- chain
UPDATE public.words SET level = 'elem_6' WHERE id = 586;  -- choice
UPDATE public.words SET level = 'elem_6' WHERE id = 3203;  -- coal
UPDATE public.words SET level = 'elem_6' WHERE id = 974;  -- common
UPDATE public.words SET level = 'elem_6' WHERE id = 1389;  -- create
UPDATE public.words SET level = 'elem_6' WHERE id = 574;  -- during
UPDATE public.words SET level = 'elem_6' WHERE id = 1603;  -- earn
UPDATE public.words SET level = 'elem_6' WHERE id = 596;  -- edge
UPDATE public.words SET level = 'elem_6' WHERE id = 524;  -- either
UPDATE public.words SET level = 'elem_6' WHERE id = 386;  -- energy
UPDATE public.words SET level = 'elem_6' WHERE id = 558;  -- engine
UPDATE public.words SET level = 'elem_6' WHERE id = 1393;  -- equal
UPDATE public.words SET level = 'elem_6' WHERE id = 892;  -- event
UPDATE public.words SET level = 'elem_6' WHERE id = 913;  -- form
UPDATE public.words SET level = 'elem_6' WHERE id = 445;  -- handle

UPDATE public.words SET level = 'elem_5' WHERE id = 824;  -- believe
UPDATE public.words SET level = 'elem_5' WHERE id = 198;  -- collect
UPDATE public.words SET level = 'elem_5' WHERE id = 493;  -- correct
UPDATE public.words SET level = 'elem_5' WHERE id = 861;  -- dangerous
UPDATE public.words SET level = 'elem_5' WHERE id = 394;  -- decorate
UPDATE public.words SET level = 'elem_5' WHERE id = 333;  -- delicious
UPDATE public.words SET level = 'elem_5' WHERE id = 316;  -- different
UPDATE public.words SET level = 'elem_5' WHERE id = 895;  -- exercise
UPDATE public.words SET level = 'elem_5' WHERE id = 252;  -- expensive
UPDATE public.words SET level = 'elem_5' WHERE id = 193;  -- festival
UPDATE public.words SET level = 'elem_5' WHERE id = 304;  -- habit
UPDATE public.words SET level = 'elem_5' WHERE id = 880;  -- important
UPDATE public.words SET level = 'elem_5' WHERE id = 320;  -- market
UPDATE public.words SET level = 'elem_5' WHERE id = 308;  -- popular
UPDATE public.words SET level = 'elem_5' WHERE id = 298;  -- present
UPDATE public.words SET level = 'elem_5' WHERE id = 489;  -- return
UPDATE public.words SET level = 'elem_5' WHERE id = 359;  -- visitor
UPDATE public.words SET level = 'elem_5' WHERE id = 918;  -- wedding

-- === elem_6↔mid_1 스왑 (21쌍) ===

UPDATE public.words SET level = 'mid_1' WHERE id = 570;  -- amount
UPDATE public.words SET level = 'mid_1' WHERE id = 1271;  -- angle
UPDATE public.words SET level = 'mid_1' WHERE id = 571;  -- appear
UPDATE public.words SET level = 'mid_1' WHERE id = 512;  -- cancel
UPDATE public.words SET level = 'mid_1' WHERE id = 566;  -- cause
UPDATE public.words SET level = 'mid_1' WHERE id = 560;  -- difference
UPDATE public.words SET level = 'mid_1' WHERE id = 578;  -- distance
UPDATE public.words SET level = 'mid_1' WHERE id = 475;  -- divide
UPDATE public.words SET level = 'mid_1' WHERE id = 1255;  -- duty
UPDATE public.words SET level = 'mid_1' WHERE id = 1167;  -- editor
UPDATE public.words SET level = 'mid_1' WHERE id = 553;  -- environment
UPDATE public.words SET level = 'mid_1' WHERE id = 519;  -- escape
UPDATE public.words SET level = 'mid_1' WHERE id = 434;  -- exact
UPDATE public.words SET level = 'mid_1' WHERE id = 1162;  -- experience
UPDATE public.words SET level = 'mid_1' WHERE id = 1415;  -- express
UPDATE public.words SET level = 'mid_1' WHERE id = 589;  -- figure
UPDATE public.words SET level = 'mid_1' WHERE id = 1023;  -- force
UPDATE public.words SET level = 'mid_1' WHERE id = 3145;  -- freedom
UPDATE public.words SET level = 'mid_1' WHERE id = 1873;  -- grammar
UPDATE public.words SET level = 'mid_1' WHERE id = 1239;  -- harm
UPDATE public.words SET level = 'mid_1' WHERE id = 1207;  -- honor

UPDATE public.words SET level = 'elem_6' WHERE id = 357;  -- chef
UPDATE public.words SET level = 'elem_6' WHERE id = 278;  -- nervous
UPDATE public.words SET level = 'elem_6' WHERE id = 1913;  -- patient
UPDATE public.words SET level = 'elem_6' WHERE id = 213;  -- uniform
UPDATE public.words SET level = 'elem_6' WHERE id = 463;  -- adventure
UPDATE public.words SET level = 'elem_6' WHERE id = 1748;  -- illness
UPDATE public.words SET level = 'elem_6' WHERE id = 981;  -- journey
UPDATE public.words SET level = 'elem_6' WHERE id = 1766;  -- battery
UPDATE public.words SET level = 'elem_6' WHERE id = 1720;  -- virus
UPDATE public.words SET level = 'elem_6' WHERE id = 3175;  -- vitamin
UPDATE public.words SET level = 'elem_6' WHERE id = 3176;  -- calorie
UPDATE public.words SET level = 'elem_6' WHERE id = 1712;  -- fashion
UPDATE public.words SET level = 'elem_6' WHERE id = 1662;  -- massage
UPDATE public.words SET level = 'elem_6' WHERE id = 1653;  -- lipstick
UPDATE public.words SET level = 'elem_6' WHERE id = 1804;  -- scanner
UPDATE public.words SET level = 'elem_6' WHERE id = 1655;  -- panic
UPDATE public.words SET level = 'elem_6' WHERE id = 1814;  -- passport
UPDATE public.words SET level = 'elem_6' WHERE id = 2001;  -- mathematics
UPDATE public.words SET level = 'elem_6' WHERE id = 1974;  -- gossip
UPDATE public.words SET level = 'elem_6' WHERE id = 1718;  -- nightmare
UPDATE public.words SET level = 'elem_6' WHERE id = 1820;  -- gasoline

-- === mid_1↔mid_2 스왑 (21쌍) ===

UPDATE public.words SET level = 'mid_2' WHERE id = 730;  -- intend
UPDATE public.words SET level = 'mid_2' WHERE id = 697;  -- compose
UPDATE public.words SET level = 'mid_2' WHERE id = 1455;  -- obtain
UPDATE public.words SET level = 'mid_2' WHERE id = 645;  -- commit
UPDATE public.words SET level = 'mid_2' WHERE id = 644;  -- outcome
UPDATE public.words SET level = 'mid_2' WHERE id = 623;  -- vary
UPDATE public.words SET level = 'mid_2' WHERE id = 629;  -- refer
UPDATE public.words SET level = 'mid_2' WHERE id = 602;  -- deny
UPDATE public.words SET level = 'mid_2' WHERE id = 604;  -- seek
UPDATE public.words SET level = 'mid_2' WHERE id = 643;  -- tend
UPDATE public.words SET level = 'mid_2' WHERE id = 646;  -- capture
UPDATE public.words SET level = 'mid_2' WHERE id = 612;  -- invest
UPDATE public.words SET level = 'mid_2' WHERE id = 1358;  -- policy
UPDATE public.words SET level = 'mid_2' WHERE id = 2496;  -- council
UPDATE public.words SET level = 'mid_2' WHERE id = 2266;  -- inspect
UPDATE public.words SET level = 'mid_2' WHERE id = 3103;  -- submit
UPDATE public.words SET level = 'mid_2' WHERE id = 732;  -- define
UPDATE public.words SET level = 'mid_2' WHERE id = 800;  -- stable
UPDATE public.words SET level = 'mid_2' WHERE id = 789;  -- status
UPDATE public.words SET level = 'mid_2' WHERE id = 755;  -- fund
UPDATE public.words SET level = 'mid_2' WHERE id = 626;  -- budget

UPDATE public.words SET level = 'mid_1' WHERE id = 442;  -- similar
UPDATE public.words SET level = 'mid_1' WHERE id = 447;  -- celebrate
UPDATE public.words SET level = 'mid_1' WHERE id = 428;  -- describe
UPDATE public.words SET level = 'mid_1' WHERE id = 439;  -- increase
UPDATE public.words SET level = 'mid_1' WHERE id = 477;  -- society
UPDATE public.words SET level = 'mid_1' WHERE id = 871;  -- necessary
UPDATE public.words SET level = 'mid_1' WHERE id = 1241;  -- suggest
UPDATE public.words SET level = 'mid_1' WHERE id = 799;  -- provide
UPDATE public.words SET level = 'mid_1' WHERE id = 1928;  -- realize
UPDATE public.words SET level = 'mid_1' WHERE id = 1311;  -- encourage
UPDATE public.words SET level = 'mid_1' WHERE id = 700;  -- support
UPDATE public.words SET level = 'mid_1' WHERE id = 579;  -- consider
UPDATE public.words SET level = 'mid_1' WHERE id = 708;  -- require
UPDATE public.words SET level = 'mid_1' WHERE id = 698;  -- respond
UPDATE public.words SET level = 'mid_1' WHERE id = 877;  -- especially
UPDATE public.words SET level = 'mid_1' WHERE id = 3024;  -- challenge
UPDATE public.words SET level = 'mid_1' WHERE id = 828;  -- technology
UPDATE public.words SET level = 'mid_1' WHERE id = 1792;  -- interview
UPDATE public.words SET level = 'mid_1' WHERE id = 1794;  -- marathon
UPDATE public.words SET level = 'mid_1' WHERE id = 888;  -- feedback
UPDATE public.words SET level = 'mid_1' WHERE id = 367;  -- basement

-- === mid_2↔mid_3 스왑 (12쌍) ===

UPDATE public.words SET level = 'mid_3' WHERE id = 766;  -- yield
UPDATE public.words SET level = 'mid_3' WHERE id = 756;  -- cease
UPDATE public.words SET level = 'mid_3' WHERE id = 1398;  -- accuse
UPDATE public.words SET level = 'mid_3' WHERE id = 1628;  -- betray
UPDATE public.words SET level = 'mid_3' WHERE id = 2271;  -- convey
UPDATE public.words SET level = 'mid_3' WHERE id = 2264;  -- behalf
UPDATE public.words SET level = 'mid_3' WHERE id = 3872;  -- mere
UPDATE public.words SET level = 'mid_3' WHERE id = 3551;  -- cater
UPDATE public.words SET level = 'mid_3' WHERE id = 3201;  -- ore
UPDATE public.words SET level = 'mid_3' WHERE id = 3343;  -- acre
UPDATE public.words SET level = 'mid_3' WHERE id = 736;  -- assure
UPDATE public.words SET level = 'mid_3' WHERE id = 683;  -- devote

UPDATE public.words SET level = 'mid_2' WHERE id = 606;  -- propose
UPDATE public.words SET level = 'mid_2' WHERE id = 607;  -- resolve
UPDATE public.words SET level = 'mid_2' WHERE id = 610;  -- ecosystem
UPDATE public.words SET level = 'mid_2' WHERE id = 617;  -- ensure
UPDATE public.words SET level = 'mid_2' WHERE id = 1340;  -- concept
UPDATE public.words SET level = 'mid_2' WHERE id = 1683;  -- tension
UPDATE public.words SET level = 'mid_2' WHERE id = 2205;  -- database
UPDATE public.words SET level = 'mid_2' WHERE id = 2209;  -- consumer
UPDATE public.words SET level = 'mid_2' WHERE id = 890;  -- broadcast
UPDATE public.words SET level = 'mid_2' WHERE id = 1136;  -- ancestor
UPDATE public.words SET level = 'mid_2' WHERE id = 1051;  -- agriculture
UPDATE public.words SET level = 'mid_2' WHERE id = 1110;  -- campaign

-- === mid_3↔high_1 스왑 (3쌍) ===

UPDATE public.words SET level = 'high_1' WHERE id = 2477;  -- kernel
UPDATE public.words SET level = 'high_1' WHERE id = 3838;  -- kindle
UPDATE public.words SET level = 'high_1' WHERE id = 2304;  -- quarterly

UPDATE public.words SET level = 'mid_3' WHERE id = 2519;  -- appreciation
UPDATE public.words SET level = 'mid_3' WHERE id = 1187;  -- expectation
UPDATE public.words SET level = 'mid_3' WHERE id = 972;  -- willingness

-- === high_1↔high_2 스왑 (84쌍) ===

UPDATE public.words SET level = 'high_2' WHERE id = 3558;  -- clamber
UPDATE public.words SET level = 'high_2' WHERE id = 3602;  -- corrode
UPDATE public.words SET level = 'high_2' WHERE id = 3603;  -- covert
UPDATE public.words SET level = 'high_2' WHERE id = 3613;  -- cynical
UPDATE public.words SET level = 'high_2' WHERE id = 3629;  -- demeanor
UPDATE public.words SET level = 'high_2' WHERE id = 3630;  -- demise
UPDATE public.words SET level = 'high_2' WHERE id = 3631;  -- denounce
UPDATE public.words SET level = 'high_2' WHERE id = 3633;  -- deplete
UPDATE public.words SET level = 'high_2' WHERE id = 3639;  -- desolate
UPDATE public.words SET level = 'high_2' WHERE id = 3652;  -- dire
UPDATE public.words SET level = 'high_2' WHERE id = 3653;  -- discern
UPDATE public.words SET level = 'high_2' WHERE id = 3658;  -- dismal
UPDATE public.words SET level = 'high_2' WHERE id = 3669;  -- doctrine
UPDATE public.words SET level = 'high_2' WHERE id = 3674;  -- dubious
UPDATE public.words SET level = 'high_2' WHERE id = 3675;  -- dwindle
UPDATE public.words SET level = 'high_2' WHERE id = 3683;  -- elation
UPDATE public.words SET level = 'high_2' WHERE id = 3684;  -- elicit
UPDATE public.words SET level = 'high_2' WHERE id = 3690;  -- eminent
UPDATE public.words SET level = 'high_2' WHERE id = 3701;  -- entail
UPDATE public.words SET level = 'high_2' WHERE id = 3703;  -- envision
UPDATE public.words SET level = 'high_2' WHERE id = 3713;  -- esteem
UPDATE public.words SET level = 'high_2' WHERE id = 3721;  -- exert
UPDATE public.words SET level = 'high_2' WHERE id = 3723;  -- exile
UPDATE public.words SET level = 'high_2' WHERE id = 3726;  -- exponent
UPDATE public.words SET level = 'high_2' WHERE id = 3733;  -- facet
UPDATE public.words SET level = 'high_2' WHERE id = 3734;  -- faction
UPDATE public.words SET level = 'high_2' WHERE id = 3740;  -- fickle
UPDATE public.words SET level = 'high_2' WHERE id = 3741;  -- fiscal
UPDATE public.words SET level = 'high_2' WHERE id = 3746;  -- forfeit
UPDATE public.words SET level = 'high_2' WHERE id = 3752;  -- frugal
UPDATE public.words SET level = 'high_2' WHERE id = 3754;  -- futile
UPDATE public.words SET level = 'high_2' WHERE id = 3759;  -- genial
UPDATE public.words SET level = 'high_2' WHERE id = 3761;  -- gist
UPDATE public.words SET level = 'high_2' WHERE id = 3762;  -- gratify
UPDATE public.words SET level = 'high_2' WHERE id = 3767;  -- gullible
UPDATE public.words SET level = 'high_2' WHERE id = 3769;  -- hamper
UPDATE public.words SET level = 'high_2' WHERE id = 3772;  -- hasten
UPDATE public.words SET level = 'high_2' WHERE id = 3783;  -- immerse
UPDATE public.words SET level = 'high_2' WHERE id = 3791;  -- impede
UPDATE public.words SET level = 'high_2' WHERE id = 3799;  -- improvise
UPDATE public.words SET level = 'high_2' WHERE id = 3801;  -- incite
UPDATE public.words SET level = 'high_2' WHERE id = 3805;  -- indifferent
UPDATE public.words SET level = 'high_2' WHERE id = 3809;  -- induce
UPDATE public.words SET level = 'high_2' WHERE id = 3810;  -- inept
UPDATE public.words SET level = 'high_2' WHERE id = 3812;  -- inflict
UPDATE public.words SET level = 'high_2' WHERE id = 3813;  -- infuse
UPDATE public.words SET level = 'high_2' WHERE id = 3816;  -- inhibit
UPDATE public.words SET level = 'high_2' WHERE id = 3817;  -- innate
UPDATE public.words SET level = 'high_2' WHERE id = 3819;  -- inscription
UPDATE public.words SET level = 'high_2' WHERE id = 3823;  -- intercept
UPDATE public.words SET level = 'high_2' WHERE id = 3830;  -- invoke
UPDATE public.words SET level = 'high_2' WHERE id = 3839;  -- kinship
UPDATE public.words SET level = 'high_2' WHERE id = 3840;  -- kudos
UPDATE public.words SET level = 'high_2' WHERE id = 3843;  -- lament
UPDATE public.words SET level = 'high_2' WHERE id = 3846;  -- lethal
UPDATE public.words SET level = 'high_2' WHERE id = 3851;  -- linger
UPDATE public.words SET level = 'high_2' WHERE id = 3854;  -- loathe
UPDATE public.words SET level = 'high_2' WHERE id = 3855;  -- lofty
UPDATE public.words SET level = 'high_2' WHERE id = 3867;  -- meager
UPDATE public.words SET level = 'high_2' WHERE id = 3869;  -- menace
UPDATE public.words SET level = 'high_2' WHERE id = 3874;  -- mingle
UPDATE public.words SET level = 'high_2' WHERE id = 3885;  -- nominal
UPDATE public.words SET level = 'high_2' WHERE id = 3889;  -- novice
UPDATE public.words SET level = 'high_2' WHERE id = 3890;  -- nurture
UPDATE public.words SET level = 'high_2' WHERE id = 3894;  -- obscure
UPDATE public.words SET level = 'high_2' WHERE id = 3898;  -- onset
UPDATE public.words SET level = 'high_2' WHERE id = 3899;  -- oppress
UPDATE public.words SET level = 'high_2' WHERE id = 3901;  -- ordeal
UPDATE public.words SET level = 'high_2' WHERE id = 3906;  -- overthrow
UPDATE public.words SET level = 'high_2' WHERE id = 3907;  -- pact
UPDATE public.words SET level = 'high_2' WHERE id = 3911;  -- paradox
UPDATE public.words SET level = 'high_2' WHERE id = 3923;  -- persevere
UPDATE public.words SET level = 'high_2' WHERE id = 3927;  -- pivotal
UPDATE public.words SET level = 'high_2' WHERE id = 3935;  -- premise
UPDATE public.words SET level = 'high_2' WHERE id = 4001;  -- proclaim
UPDATE public.words SET level = 'high_2' WHERE id = 3938;  -- profound
UPDATE public.words SET level = 'high_2' WHERE id = 3944;  -- prudent
UPDATE public.words SET level = 'high_2' WHERE id = 3957;  -- resilience
UPDATE public.words SET level = 'high_2' WHERE id = 3958;  -- resilient
UPDATE public.words SET level = 'high_2' WHERE id = 3959;  -- retract
UPDATE public.words SET level = 'high_2' WHERE id = 3961;  -- revoke
UPDATE public.words SET level = 'high_2' WHERE id = 3969;  -- serene
UPDATE public.words SET level = 'high_2' WHERE id = 3972;  -- speculate
UPDATE public.words SET level = 'high_2' WHERE id = 3973;  -- stimulus

UPDATE public.words SET level = 'high_1' WHERE id = 2414;  -- abandonment
UPDATE public.words SET level = 'high_1' WHERE id = 2119;  -- absorption
UPDATE public.words SET level = 'high_1' WHERE id = 2163;  -- acceleration
UPDATE public.words SET level = 'high_1' WHERE id = 2254;  -- accommodate
UPDATE public.words SET level = 'high_1' WHERE id = 1080;  -- accommodation
UPDATE public.words SET level = 'high_1' WHERE id = 2253;  -- accordance
UPDATE public.words SET level = 'high_1' WHERE id = 2060;  -- accordingly
UPDATE public.words SET level = 'high_1' WHERE id = 2265;  -- accountable
UPDATE public.words SET level = 'high_1' WHERE id = 2340;  -- accumulate
UPDATE public.words SET level = 'high_1' WHERE id = 1085;  -- adaptability
UPDATE public.words SET level = 'high_1' WHERE id = 975;  -- administrative
UPDATE public.words SET level = 'high_1' WHERE id = 2217;  -- adversity
UPDATE public.words SET level = 'high_1' WHERE id = 2156;  -- aesthetic
UPDATE public.words SET level = 'high_1' WHERE id = 2398;  -- analytical
UPDATE public.words SET level = 'high_1' WHERE id = 2096;  -- applicable
UPDATE public.words SET level = 'high_1' WHERE id = 2211;  -- catastrophe
UPDATE public.words SET level = 'high_1' WHERE id = 3564;  -- cognitive
UPDATE public.words SET level = 'high_1' WHERE id = 2197;  -- commencement
UPDATE public.words SET level = 'high_1' WHERE id = 2430;  -- commodity
UPDATE public.words SET level = 'high_1' WHERE id = 2366;  -- configuration
UPDATE public.words SET level = 'high_1' WHERE id = 3070;  -- consensus
UPDATE public.words SET level = 'high_1' WHERE id = 2273;  -- correlation
UPDATE public.words SET level = 'high_1' WHERE id = 2272;  -- deficiency
UPDATE public.words SET level = 'high_1' WHERE id = 2319;  -- demographic
UPDATE public.words SET level = 'high_1' WHERE id = 2058;  -- deployment
UPDATE public.words SET level = 'high_1' WHERE id = 2232;  -- deteriorate
UPDATE public.words SET level = 'high_1' WHERE id = 1684;  -- differentiate
UPDATE public.words SET level = 'high_1' WHERE id = 2210;  -- disclosure
UPDATE public.words SET level = 'high_1' WHERE id = 2285;  -- dominance
UPDATE public.words SET level = 'high_1' WHERE id = 2303;  -- editorial
UPDATE public.words SET level = 'high_1' WHERE id = 2186;  -- empirical
UPDATE public.words SET level = 'high_1' WHERE id = 3319;  -- empowerment
UPDATE public.words SET level = 'high_1' WHERE id = 2059;  -- equilibrium
UPDATE public.words SET level = 'high_1' WHERE id = 2454;  -- exploitation
UPDATE public.words SET level = 'high_1' WHERE id = 2063;  -- facilitate
UPDATE public.words SET level = 'high_1' WHERE id = 2293;  -- feasibility
UPDATE public.words SET level = 'high_1' WHERE id = 2138;  -- federation
UPDATE public.words SET level = 'high_1' WHERE id = 2279;  -- fluctuate
UPDATE public.words SET level = 'high_1' WHERE id = 2212;  -- hierarchy
UPDATE public.words SET level = 'high_1' WHERE id = 3245;  -- humility
UPDATE public.words SET level = 'high_1' WHERE id = 2133;  -- ideology
UPDATE public.words SET level = 'high_1' WHERE id = 2299;  -- incorporation
UPDATE public.words SET level = 'high_1' WHERE id = 3392;  -- inference
UPDATE public.words SET level = 'high_1' WHERE id = 2207;  -- juvenile
UPDATE public.words SET level = 'high_1' WHERE id = 2121;  -- legislature
UPDATE public.words SET level = 'high_1' WHERE id = 2048;  -- linguistic
UPDATE public.words SET level = 'high_1' WHERE id = 2040;  -- magnitude
UPDATE public.words SET level = 'high_1' WHERE id = 2037;  -- mediation
UPDATE public.words SET level = 'high_1' WHERE id = 2043;  -- municipal
UPDATE public.words SET level = 'high_1' WHERE id = 2450;  -- negligence
UPDATE public.words SET level = 'high_1' WHERE id = 3887;  -- nostalgia
UPDATE public.words SET level = 'high_1' WHERE id = 3895;  -- obsolete
UPDATE public.words SET level = 'high_1' WHERE id = 2130;  -- preliminary
UPDATE public.words SET level = 'high_1' WHERE id = 2021;  -- qualitative
UPDATE public.words SET level = 'high_1' WHERE id = 2390;  -- quantitative
UPDATE public.words SET level = 'high_1' WHERE id = 2168;  -- revelation
UPDATE public.words SET level = 'high_1' WHERE id = 2053;  -- rigorous
UPDATE public.words SET level = 'high_1' WHERE id = 3065;  -- sovereignty
UPDATE public.words SET level = 'high_1' WHERE id = 3152;  -- volatile
UPDATE public.words SET level = 'high_1' WHERE id = 1201;  -- foundational
UPDATE public.words SET level = 'high_1' WHERE id = 1778;  -- deviation
UPDATE public.words SET level = 'high_1' WHERE id = 3364;  -- documentation
UPDATE public.words SET level = 'high_1' WHERE id = 1698;  -- constraint
UPDATE public.words SET level = 'high_1' WHERE id = 1808;  -- contemplate
UPDATE public.words SET level = 'high_1' WHERE id = 3274;  -- sequential
UPDATE public.words SET level = 'high_1' WHERE id = 3168;  -- mutation
UPDATE public.words SET level = 'high_1' WHERE id = 2370;  -- abbreviation
UPDATE public.words SET level = 'high_1' WHERE id = 2175;  -- accumulation
UPDATE public.words SET level = 'high_1' WHERE id = 2076;  -- acquisition
UPDATE public.words SET level = 'high_1' WHERE id = 2443;  -- allocation
UPDATE public.words SET level = 'high_1' WHERE id = 2501;  -- amendment
UPDATE public.words SET level = 'high_1' WHERE id = 3488;  -- aftermath
UPDATE public.words SET level = 'high_1' WHERE id = 2238;  -- affirmative
UPDATE public.words SET level = 'high_1' WHERE id = 2199;  -- beneficiary
UPDATE public.words SET level = 'high_1' WHERE id = 3226;  -- coalition
UPDATE public.words SET level = 'high_1' WHERE id = 3344;  -- confiscate
UPDATE public.words SET level = 'high_1' WHERE id = 3607;  -- culminate
UPDATE public.words SET level = 'high_1' WHERE id = 3643;  -- detrimental
UPDATE public.words SET level = 'high_1' WHERE id = 2260;  -- disruption
UPDATE public.words SET level = 'high_1' WHERE id = 3693;  -- encompass
UPDATE public.words SET level = 'high_1' WHERE id = 2177;  -- formulation
UPDATE public.words SET level = 'high_1' WHERE id = 2041;  -- abbreviate
UPDATE public.words SET level = 'high_1' WHERE id = 3071;  -- prerequisite
UPDATE public.words SET level = 'high_1' WHERE id = 3865;  -- manifest


-- ============================================================
-- GRE 단어 삭제 및 수능 수준 단어로 교체 (94개)
-- ============================================================

DELETE FROM public.words WHERE id = 3479;  -- abstruse (난해한)
DELETE FROM public.words WHERE id = 3481;  -- acquiesce (마지못해 따르다)
DELETE FROM public.words WHERE id = 3520;  -- avarice (탐욕)
DELETE FROM public.words WHERE id = 3526;  -- beguile (매혹하다)
DELETE FROM public.words WHERE id = 3527;  -- belie (거짓으로 나타내다)
DELETE FROM public.words WHERE id = 3528;  -- belligerent (호전적인)
DELETE FROM public.words WHERE id = 3538;  -- brazen (뻔뻔한)
DELETE FROM public.words WHERE id = 3541;  -- bucolic (전원의)
DELETE FROM public.words WHERE id = 3543;  -- cacophony (불협화음, 시끄러운 소리)
DELETE FROM public.words WHERE id = 3544;  -- cajole (구슬리다)
DELETE FROM public.words WHERE id = 3548;  -- capitulate (항복하다)
DELETE FROM public.words WHERE id = 3549;  -- capricious (변덕스러운)
DELETE FROM public.words WHERE id = 3552;  -- caustic (신랄한)
DELETE FROM public.words WHERE id = 3568;  -- commodious (넓은)
DELETE FROM public.words WHERE id = 3595;  -- conundrum (난제)
DELETE FROM public.words WHERE id = 3600;  -- corollary (필연적 결과)
DELETE FROM public.words WHERE id = 3601;  -- corroborate (확증하다)
DELETE FROM public.words WHERE id = 3615;  -- dearth (부족, 결핍)
DELETE FROM public.words WHERE id = 3616;  -- debacle (대실패)
DELETE FROM public.words WHERE id = 3617;  -- debilitate (약화시키다)
DELETE FROM public.words WHERE id = 3627;  -- deleterious (해로운, 유해한)
DELETE FROM public.words WHERE id = 3628;  -- delineate (윤곽을 그리다)
DELETE FROM public.words WHERE id = 3634;  -- deplorable (한탄스러운)
DELETE FROM public.words WHERE id = 3636;  -- derelict (버려진)
DELETE FROM public.words WHERE id = 3638;  -- desiccate (건조시키다)
DELETE FROM public.words WHERE id = 3640;  -- despot (폭군)
DELETE FROM public.words WHERE id = 3651;  -- diminutive (아주 작은)
DELETE FROM public.words WHERE id = 3673;  -- draconian (가혹한)
DELETE FROM public.words WHERE id = 3676;  -- ebullient (열정적인)
DELETE FROM public.words WHERE id = 3678;  -- eclectic (절충적인)
DELETE FROM public.words WHERE id = 3680;  -- edifice (건물)
DELETE FROM public.words WHERE id = 3682;  -- egregious (지독한)
DELETE FROM public.words WHERE id = 3704;  -- ephemeral (수명이 짧은, 덧없는)
DELETE FROM public.words WHERE id = 3706;  -- equivocal (모호한, 애매한)
DELETE FROM public.words WHERE id = 3710;  -- esoteric (난해한, 소수만 아는)
DELETE FROM public.words WHERE id = 3711;  -- espionage (간첩 행위)
DELETE FROM public.words WHERE id = 4020;  -- extricate (구출하다)
DELETE FROM public.words WHERE id = 3736;  -- fastidious (꼼꼼한)
DELETE FROM public.words WHERE id = 3739;  -- fiasco (대실패)
DELETE FROM public.words WHERE id = 3742;  -- flagrant (명백한)
DELETE FROM public.words WHERE id = 3758;  -- garrulous (수다스러운)
DELETE FROM public.words WHERE id = 3766;  -- guile (교활함)
DELETE FROM public.words WHERE id = 3768;  -- hackneyed (진부한, 낡아빠진)
DELETE FROM public.words WHERE id = 3771;  -- harbinger (전조)
DELETE FROM public.words WHERE id = 3774;  -- heresy (이단)
DELETE FROM public.words WHERE id = 3775;  -- heuristic (체험적인)
DELETE FROM public.words WHERE id = 3781;  -- idiosyncrasy (특이한 버릇)
DELETE FROM public.words WHERE id = 3782;  -- ignominious (불명예스러운)
DELETE FROM public.words WHERE id = 3785;  -- immutable (변경할 수 없는)
DELETE FROM public.words WHERE id = 3790;  -- impecunious (무일푼의, 가난한)
DELETE FROM public.words WHERE id = 3794;  -- impervious (~에 영향받지 않는)
DELETE FROM public.words WHERE id = 3803;  -- incongruous (어울리지 않는)
DELETE FROM public.words WHERE id = 3808;  -- indolent (게으른)
DELETE FROM public.words WHERE id = 4022;  -- inscrutable (불가해한)
DELETE FROM public.words WHERE id = 3820;  -- insidious (교활한)
DELETE FROM public.words WHERE id = 3832;  -- irrevocable (돌이킬 수 없는)
DELETE FROM public.words WHERE id = 3834;  -- jubilant (승리감에 넘치는)
DELETE FROM public.words WHERE id = 3836;  -- jurisprudence (법학)
DELETE FROM public.words WHERE id = 3837;  -- juxtapose (나란히 놓다)
DELETE FROM public.words WHERE id = 3841;  -- laborious (힘든)
DELETE FROM public.words WHERE id = 3842;  -- laconic (간결한)
DELETE FROM public.words WHERE id = 3844;  -- languish (시들다)
DELETE FROM public.words WHERE id = 3847;  -- lethargic (무기력한)
DELETE FROM public.words WHERE id = 3849;  -- levity (경솔함)
DELETE FROM public.words WHERE id = 3852;  -- listless (무기력한)
DELETE FROM public.words WHERE id = 3859;  -- magnanimous (관대한)
DELETE FROM public.words WHERE id = 4024;  -- magnanimity (관대함)
DELETE FROM public.words WHERE id = 3860;  -- malady (질병)
DELETE FROM public.words WHERE id = 3861;  -- malevolent (악의적인)
DELETE FROM public.words WHERE id = 3871;  -- mercurial (변덕스러운)
DELETE FROM public.words WHERE id = 3875;  -- misnomer (잘못된 명칭)
DELETE FROM public.words WHERE id = 3881;  -- nefarious (사악한)
DELETE FROM public.words WHERE id = 3884;  -- neophyte (초보자)
DELETE FROM public.words WHERE id = 3891;  -- obfuscate (애매하게 하다)
DELETE FROM public.words WHERE id = 3892;  -- oblique (비스듬한)
DELETE FROM public.words WHERE id = 4026;  -- obsequious (아첨하는)
DELETE FROM public.words WHERE id = 3900;  -- opulent (호화로운)
DELETE FROM public.words WHERE id = 3903;  -- ostentatious (과시하는, 허세 부리는)
DELETE FROM public.words WHERE id = 3909;  -- panacea (만병통치약)
DELETE FROM public.words WHERE id = 3912;  -- parsimonious (인색한)
DELETE FROM public.words WHERE id = 3914;  -- patrimony (유산)
DELETE FROM public.words WHERE id = 3920;  -- perfunctory (형식적인, 마지못해 하는)
DELETE FROM public.words WHERE id = 3929;  -- plethora (과다)
DELETE FROM public.words WHERE id = 3930;  -- posthumous (사후의)
DELETE FROM public.words WHERE id = 4029;  -- promulgate (공포하다)
DELETE FROM public.words WHERE id = 3947;  -- querulous (불평하는)
DELETE FROM public.words WHERE id = 3948;  -- quixotic (돈키호테식의)
DELETE FROM public.words WHERE id = 3950;  -- recalcitrant (저항하는)
DELETE FROM public.words WHERE id = 3964;  -- sagacious (현명한)
DELETE FROM public.words WHERE id = 3965;  -- sanctimonious (독선적인)
DELETE FROM public.words WHERE id = 3968;  -- serendipity (뜻밖의 행운)
DELETE FROM public.words WHERE id = 4034;  -- subjugate (정복하다)
DELETE FROM public.words WHERE id = 4035;  -- subterfuge (속임수)
DELETE FROM public.words WHERE id = 4036;  -- superfluous (불필요한)

-- 새 수능 수준 단어 삽입 (94개)

INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'assertive', '자기주장이 강한', '단호한', 'An assertive leader clearly communicates expectations to the team.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'attentive', '주의 깊은', '세심한', 'The attentive student noticed every detail in the lecture.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'benchmark', '기준점', '벤치마크', 'This test score serves as a benchmark for future performance.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'bureaucratic', '관료적인', NULL, 'The bureaucratic process made it difficult to get quick approval.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'calibrate', '보정하다', '조정하다', 'Scientists must calibrate their instruments before conducting experiments.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'circumference', '둘레', '원주', 'The circumference of the Earth is approximately forty thousand kilometers.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'commemorate', '기념하다', '추모하다', 'The city built a monument to commemorate the historic event.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'compartment', '칸', '구획', 'Each compartment of the train was designed for different purposes.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'compulsory', '의무적인', '필수의', 'Education is compulsory for all children between six and fifteen.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'condensation', '응결', '응축', 'Condensation forms on cold glass surfaces during humid weather.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'conscientious', '성실한', '양심적인', 'A conscientious worker always double-checks the quality of their work.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'consecutive', '연속적인', NULL, 'The team won five consecutive games this season.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'diagnostic', '진단의', '진단용의', 'The doctor ordered diagnostic tests to identify the cause of illness.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'differentiation', '차별화', '분화', 'Cell differentiation is a key process in biological development.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'diversify', '다양화하다', '다각화하다', 'The company decided to diversify its product line for growth.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'electorate', '유권자', '선거민', 'The electorate will vote on the new education policy next month.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'embargo', '금수 조치', '통상 금지', 'The government imposed an embargo on oil imports from that country.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'endurance', '인내력', '지구력', 'Marathon runners need great endurance to complete the long race.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'enlighten', '계몽하다', '깨우치다', 'The documentary aimed to enlighten the public about climate change.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'equitable', '공정한', '공평한', 'An equitable distribution of resources is essential for social harmony.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'evade', '회피하다', '피하다', 'The suspect tried to evade the police by hiding in the building.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'exemplify', '예시하다', '전형이 되다', 'Her research exemplifies the best practices in scientific methodology.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'fabrication', '조작', '제작', 'The journalist was fired for the fabrication of news stories.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'fortify', '강화하다', '보강하다', 'They decided to fortify the walls to protect against flooding.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'fragmentation', '분열', '단편화', 'Habitat fragmentation threatens many species around the world.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'friction', '마찰', '갈등', 'Friction between the two groups led to a heated debate.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'governance', '통치', '거버넌스', 'Good governance requires transparency and accountability from leaders.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'holistic', '전체론적인', '총체적인', 'A holistic approach to health considers both mind and body.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'illuminate', '비추다', '밝히다', 'The new research helped illuminate the causes of the disease.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'incidence', '발생률', '빈도', 'The incidence of heart disease has decreased due to better diets.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'indispensable', '필수불가결한', '없어서는 안 될', 'Clean water is indispensable for human survival and public health.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'instrumental', '중요한 역할을 하는', '기악의', 'Technology has been instrumental in advancing modern medical treatments.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'irreversible', '되돌릴 수 없는', '비가역적인', 'Some effects of pollution on the environment are irreversible.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'latent', '잠재적인', '숨어 있는', 'The virus can remain latent in the body for many years.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'legacy', '유산', '업적', 'The scientist left a lasting legacy through her groundbreaking discoveries.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'lenient', '관대한', '너그러운', 'The teacher was lenient with students who showed genuine effort.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'literacy', '읽고 쓰는 능력', '문해력', 'Improving literacy rates is a major goal for developing nations.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'mainstream', '주류의', '대중적인', 'The idea eventually became part of mainstream scientific thinking.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'malfunction', '오작동', '고장', 'A malfunction in the engine caused the flight to be delayed.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'maritime', '해양의', '해상의', 'Maritime trade has connected different cultures for thousands of years.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'maturation', '성숙', '숙성', 'The maturation of the brain continues well into early adulthood.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'methodology', '방법론', NULL, 'The researcher explained the methodology used in the experiment.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'monetary', '금전적인', '통화의', 'The central bank adjusted its monetary policy to control inflation.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'negligible', '무시해도 될 만한', '극소의', 'The difference in temperature between the two samples was negligible.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'neutrality', '중립', '중립성', 'The country maintained its neutrality during the international conflict.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'nominate', '지명하다', '추천하다', 'The committee will nominate a candidate for the leadership position.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'obligatory', '의무적인', '필수의', 'Wearing a seatbelt is obligatory for all passengers in the vehicle.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'oversight', '감독', '실수', 'The error was due to an oversight during the review process.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'paraphrase', '바꿔 말하다', '의역하다', 'Students should learn to paraphrase information rather than copy it directly.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'peripheral', '주변의', '부차적인', 'Peripheral vision allows us to detect movement outside our direct gaze.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'petition', '청원', '탄원서', 'Citizens signed a petition to protect the local park from development.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'predominant', '지배적인', '우세한', 'English is the predominant language used in international business.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'prescription', '처방전', '처방', 'The doctor wrote a prescription for medicine to treat the infection.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'prestige', '명성', '위신', 'The university has gained international prestige for its research programs.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'procurement', '조달', '획득', 'The procurement of medical supplies became urgent during the pandemic.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'proficiency', '능숙함', '숙련도', 'Language proficiency is required for admission to the program.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'prohibition', '금지', NULL, 'The prohibition of plastic bags reduced environmental pollution significantly.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'prospective', '장래의', '예비의', 'Prospective students should submit their applications before the deadline.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'provoke', '유발하다', '자극하다', 'The controversial speech was intended to provoke a public discussion.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'punitive', '처벌적인', '징벌의', 'The government introduced punitive measures against illegal dumping of waste.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'quarantine', '격리', '검역', 'Travelers were required to undergo quarantine to prevent disease spread.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'reckon', '생각하다', '추정하다', 'Experts reckon that renewable energy will dominate the market soon.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'reluctant', '꺼리는', '주저하는', 'She was reluctant to accept the offer without knowing all details.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'renowned', '유명한', '명망 있는', 'The renowned professor received an award for her contribution to science.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'replica', '복제품', '모형', 'The museum displayed a replica of the ancient Roman sculpture.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'reproduce', '재현하다', '번식하다', 'Scientists tried to reproduce the results of the original experiment.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'resentment', '분개', '원한', 'Years of unfair treatment created deep resentment among the workers.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'residual', '잔여의', '남은', 'Residual chemicals in the water can pose a risk to health.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'respective', '각각의', '각자의', 'The students returned to their respective classrooms after the assembly.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'retrieve', '되찾다', '검색하다', 'The software allows users to retrieve deleted files from the system.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'retrospect', '회고', '되돌아봄', 'In retrospect the decision to invest in technology was very wise.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'sanction', '제재', '승인', 'The United Nations imposed economic sanctions on the country.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'scrutiny', '정밀 조사', '면밀한 검토', 'The new policy came under scrutiny from environmental groups.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'sentiment', '감정', '정서', 'Public sentiment toward the policy shifted after the news report.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'solidarity', '연대', '결속', 'The workers showed solidarity by supporting each other during the strike.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'stipulation', '조건', '규정', 'The contract included a stipulation about working hours and overtime pay.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'subsidy', '보조금', '지원금', 'The government provides a subsidy to farmers affected by the drought.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'substantiate', '입증하다', '실증하다', 'The lawyer needed more evidence to substantiate the claim in court.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'successor', '후계자', '후임자', 'The board announced the successor to the retiring chief executive.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'surveillance', '감시', '감찰', 'Security cameras are used for surveillance in most public buildings.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'susceptible', '취약한', '영향받기 쉬운', 'Young children are more susceptible to infections than healthy adults.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'tangible', '실질적인', '유형의', 'The project produced tangible results that everyone could clearly see.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'trajectory', '궤적', '경로', 'The trajectory of the rocket was carefully calculated by engineers.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'tribunal', '재판소', '법정', 'The international tribunal was established to address war crimes.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'turbulence', '난기류', '혼란', 'The airplane experienced severe turbulence during the transatlantic flight.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'unanimous', '만장일치의', NULL, 'The committee reached a unanimous decision to approve the new plan.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'underlying', '근본적인', '기저의', 'The underlying cause of the problem was a lack of funding.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'undermine', '약화시키다', '훼손하다', 'False information can undermine public trust in scientific research.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'unprecedented', '전례 없는', NULL, 'The country faced an unprecedented economic crisis during the pandemic.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'validate', '검증하다', '확인하다', 'Further experiments are needed to validate the hypothesis.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'vegetation', '식생', '초목', 'Dense vegetation covers most of the tropical rainforest region.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'versatile', '다재다능한', '다용도의', 'A versatile employee can adapt quickly to different types of tasks.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'vocational', '직업의', '직업 훈련의', 'Vocational training programs prepare students for specific career paths.');
INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, example_sentence) VALUES ('word', 'high_2', 1, 'vulnerability', '취약성', '약점', 'The report highlighted the vulnerability of coastal cities to flooding.');

-- ============================================================
-- 데이터 오류 수정
-- ============================================================

UPDATE public.words SET mean_1 = '낟알', mean_2 = '핵심' WHERE id = 2477;  -- kernel 뜻 수정

-- Done.