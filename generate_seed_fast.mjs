import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDFjbOUfabXFBV1xT4fEPKYn9dkv2rzVxM";
const SQL_FILE_PATH = path.join(process.cwd(), 'supabase', 'seed_new_fast.sql');
const ORIGINAL_SQL_PATH = path.join(process.cwd(), 'supabase', 'seed.sql');

// 단계 및 배치 설정
const CONFIG = [
    { levelPrefix: 'elem', levels: ['3', '4', '5', '6'], totalSets: 64, hasExample: false }, // 1280 words
    { levelPrefix: 'mid', levels: ['1', '2', '3'], totalSets: 48, hasExample: true },       // 960 words
    { levelPrefix: 'high', levels: ['1', '2', '3'], totalSets: 48, hasExample: true },         // 960 words
];

const BATCH_SIZE = 20;

async function getWordList() {
    console.log("📥 전세계에서 가장 많이 쓰이는 영어 단어 10,000개 목록 다운로드 중...");
    const res = await fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt');
    const text = await res.text();
    // 최소 3글자 이상인 단어들만 필터링 (너무 짧은 관사 등 제외)
    const words = text.split('\n').map(w => w.trim()).filter(w => w.length >= 3);
    console.log(`✅ 단어 목록 준비 완료! (총 ${words.length}개 중 앞의 3200개를 수준별로 분배합니다.)`);
    return words;
}

async function generateBatch(wordsBatch, levelName, setNo, hasExample) {
    const prompt = `당신은 영어 사전 API입니다. 다음 ${wordsBatch.length}개의 영어 단어에 대해 한글 뜻과 예문을 작성하여 JSON 형식의 배열로 반환하세요.
단어 목록: ${wordsBatch.join(', ')}

조건 (반드시 지킬 것):
1. "word": 요청받은 영단어 그대로 사용
2. "mean_1": 가장 흔하게 쓰이는 대표적인 1번 한글 뜻
3. "mean_2": 두 번째 뜻 (있으면 작성, 없으면 null)
4. "mean_3": 세 번째 뜻 (있으면 작성, 없으면 null)
5. "example_sentence": ${hasExample ? `"마스터 챌린지"를 위한 완전히 고유한 예문 (해당 영단어가 들어가야 함)` : `반드시 null 로 설정 (초등 레벨은 예문 출력을 제한해야 함!)`}

응답은 오직 JSON 배열만 출력하며, 마크다운 백틱(\`\`\`)이나 다른 텍스트는 절대 포함하지 마세요.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" } // 확실한 JSON 반환 유도
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    let textMatches = data.candidates[0].content.parts[0].text.trim();

    try {
        return JSON.parse(textMatches);
    } catch (e) {
        console.error("JSON 파싱 에러:", textMatches);
        throw new Error("올바른 JSON 형식이 아닙니다.");
    }
}

function escapeSql(str) {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'string') {
        return "'" + str.replace(/'/g, "''") + "'";
    }
    return str;
}

async function start() {
    console.log("🚀 초고속 겹침없는 단어 생성(Fixed List Mode)을 시작합니다...");

    const allWords = await getWordList();

    // 기존 스키마 부분 복사 (line 1 ~ 81)
    let schemaSql = "";
    if (fs.existsSync(ORIGINAL_SQL_PATH)) {
        const lines = fs.readFileSync(ORIGINAL_SQL_PATH, 'utf-8').split('\n');
        const splitIndex = lines.findIndex(line => line.includes('INSERT INTO public.words'));
        if (splitIndex !== -1) {
            schemaSql = lines.slice(0, splitIndex + 1).join('\n') + '\n';
        }
    }

    if (!schemaSql) {
        schemaSql = "INSERT INTO public.words (type, level, set_no, word, mean_1, mean_2, mean_3, example_sentence) VALUES\n";
    }

    fs.writeFileSync(SQL_FILE_PATH, schemaSql);

    let isFirstInsert = true;
    let wordIndex = 0; // 사용할 단어의 인덱스

    for (const conf of CONFIG) {
        let currentSetTotal = 1;
        let subLevelIndex = 0;
        const setsPerSubLevel = Math.ceil(conf.totalSets / conf.levels.length);
        let subLevelCounter = 1;

        for (let setNum = 1; setNum <= conf.totalSets; setNum++) {
            // 학년_레벨 형태 (e.g. elem_low, middle_2)
            const subLvlStr = conf.levels[subLevelIndex] || conf.levels[conf.levels.length - 1];
            const levelName = `${conf.levelPrefix}_${subLvlStr}`;

            const batchWords = allWords.slice(wordIndex, wordIndex + BATCH_SIZE);
            wordIndex += BATCH_SIZE;

            if (batchWords.length === 0) {
                console.error("단어 목록이 부족합니다!");
                break;
            }

            console.log(`⏳ 생성 중: [${levelName}] 세트 ${currentSetTotal} ... (${setNum} / ${conf.totalSets})`);

            let retries = 3;
            let wordsData = null;
            while (retries > 0) {
                try {
                    wordsData = await generateBatch(batchWords, levelName, currentSetTotal, conf.hasExample);

                    // 가끔 JSON 파싱은 성공했으나 배열 크기가 모자라게 (예: 15개만) 대답하는 경우 걸러내기
                    if (wordsData.length < batchWords.length && retries > 1) {
                        console.log(`  ⚠️ AI가 ${batchWords.length}개 중 ${wordsData.length}개만 반환했습니다. 재시도합니다...`);
                        retries--;
                        continue;
                    }
                    break; // 성공
                } catch (e) {
                    console.error(`  ⚠️ 에러 발생, 재시도 중... 남은 횟수: ${retries - 1}`, e.message);
                    retries--;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (!wordsData || wordsData.length === 0) {
                console.error(`❌ [${levelName}] 세트 생성 실패. 진행을 이어갑니다.`);
                continue; // 실패해도 다음 세트로 넘어감
            }

            const sqlValues = wordsData.map(w => {
                // AI가 대답 시 예문에 빈 문자열을 보내면 null로 치환. 초등 방어코드
                let ex = w.example_sentence;
                if (!conf.hasExample || ex === "" || String(ex).toLowerCase() === "null") ex = null;

                return `  ('word', '${levelName}', ${currentSetTotal}, ${escapeSql(w.word)}, ${escapeSql(w.mean_1)}, ${escapeSql(w.mean_2)}, ${escapeSql(w.mean_3)}, ${escapeSql(ex)})`;
            }).join(',\n');

            fs.appendFileSync(SQL_FILE_PATH, (isFirstInsert ? "" : ",\n") + sqlValues);
            isFirstInsert = false;

            currentSetTotal++;
            subLevelCounter++;
            if (subLevelCounter > setsPerSubLevel) {
                subLevelCounter = 1;
                subLevelIndex++;
            }

            // 초당 요청 제한(Rate Limit) 방지를 위한 대기
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    fs.appendFileSync(SQL_FILE_PATH, ';\n\n-- 데이터 생성 완료\n');
    console.log(`\n✅ 성공적으로 생성 완료되었습니다!`);
    console.log(`새 파일 저장 완료: supabase/seed_new_fast.sql`);

    // 성공적으로 끝나면 원본으로 덮어쓰기 실시
    fs.copyFileSync(SQL_FILE_PATH, ORIGINAL_SQL_PATH);
    console.log(`🔥 seed.sql 덮어쓰기 완료! 이제 Supabase에 넣고 실행하시면 됩니다.`);
}

start();
