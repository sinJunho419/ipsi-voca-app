import fs from 'fs';
import path from 'path';

// =====================================================================
// [설정] API 및 생성할 데이터의 범위를 설정하세요.
// =====================================================================

// 여기에 발급받은 Gemini API 키를 입력하세요. (또는 환경변수 GEMINI_API_KEY 사용)
// 구글 AI 스튜디오(https://aistudio.google.com/)에서 무료로 발급 가능합니다.
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDFjbOUfabXFBV1xT4fEPKYn9dkv2rzVxM";

// 단계 및 세트 구성
// 초등: 500개 (20개씩 25세트) - 예문 없음
// 중등: 1200개 (20개씩 60세트) - 예문 있음
// 고등: 1500개 (20개씩 75세트) - 예문 있음
const CONFIG = [
    { levelPrefix: 'elem', levels: ['low', 'mid', 'high'], totalSets: 25, hasExample: false, gradeDesc: "초등학생 기초" },
    { levelPrefix: 'middle', levels: ['1', '2', '3'], totalSets: 60, hasExample: true, gradeDesc: "중학생 필수" },
    { levelPrefix: 'high', levels: ['1', '2', '3'], totalSets: 75, hasExample: true, gradeDesc: "고등학생 수능" },
];

const BATCH_SIZE = 20; // 1세트당 단어 수
const SQL_FILE_PATH = path.join(process.cwd(), 'supabase', 'seed_new.sql');

// 기존 seed.sql의 스키마 부분을 복사하기 위해 읽어옴
const ORIGINAL_SQL_PATH = path.join(process.cwd(), 'supabase', 'seed.sql');

async function generateBatch(levelName, setNo, gradeDesc, hasExample) {
    const prompt = `당신은 ${gradeDesc} 수준의 영단어 데이터베이스 생성기입니다.
다음 조건에 따라 ${gradeDesc} 수준에 맞는 실제 영어 단어 ${BATCH_SIZE}개를 JSON 배열 형태로만 출력하세요. 
다른 설명이나 마크다운 백틱(\`\`\`)은 절대 포함하지 마세요.

조건:
1. "word": 영단어
2. "mean_1": 가장 대표적이고 많이 쓰이는 한글 뜻
3. "mean_2": 두 번째 뜻 (선택적, 없으면 null)
4. "mean_3": 세 번째 뜻 (선택적, 없으면 null)
5. "example_sentence": ${hasExample ? `"마스터 챌린지"를 위한 예문. 이 예문은 각 단어별로 **완전히 고유한(다른 문장과 겹치지 않는) 문장**이어야 하며, 해당 단어가 자연스럽게 포함되어야 합니다.` : `반드시 null 로 설정 (초등은 예문 없음)`}

예시 포맷 (반드시 지킬 것):
[
  {
    "word": "apple",
    "mean_1": "사과",
    "mean_2": null,
    "mean_3": null,
    "example_sentence": ${hasExample ? '"The red apple fell from the tall tree."' : 'null'}
  }
]
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
            }
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const textMatches = data.candidates[0].content.parts[0].text;

    try {
        const jsonArr = JSON.parse(textMatches);
        return jsonArr;
    } catch (e) {
        console.error("JSON 파싱 에러:", textMatches);
        throw new Error("API 응답이 올바른 JSON 형식이 아닙니다.");
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
    if (API_KEY === "여기에_API_키를_입력하세요") {
        console.error("❌ API_KEY가 설정되지 않았습니다. 파일 상단의 API_KEY를 입력해주세요.");
        process.exit(1);
    }

    console.log("🚀 단어 자동 생성을 시작합니다...");

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

    for (const conf of CONFIG) {
        let currentSetTotal = 1;
        let subLevelIndex = 0;

        // 서브 레벨당 세트 수 (예: 초등은 low, mid, high 3개 레벨이니 25/3 = 약 8세트씩)
        const setsPerSubLevel = Math.ceil(conf.totalSets / conf.levels.length);
        let subLevelCounter = 1;

        for (let setNum = 1; setNum <= conf.totalSets; setNum++) {
            const levelName = `${conf.levelPrefix}_${conf.levels[subLevelIndex]}`;

            console.log(`⏳ 생성 중: [${levelName}] 세트 ${currentSetTotal} ... (${setNum} / ${conf.totalSets})`);

            let retries = 3;
            let wordsData = null;
            while (retries > 0) {
                try {
                    wordsData = await generateBatch(levelName, currentSetTotal, conf.gradeDesc, conf.hasExample);
                    break; // 성공
                } catch (e) {
                    console.error(`  ⚠️ 에러 발생, 재시도 중... 남은 횟수: ${retries - 1}`, e.message);
                    retries--;
                    // rate limit 방지
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            if (!wordsData) {
                console.error(`❌ [${levelName}] 세트 ${currentSetTotal} 생성 실패. 스크립트를 중단합니다.`);
                process.exit(1);
            }

            const sqlValues = wordsData.map(w => {
                return `  ('word', '${levelName}', ${currentSetTotal}, ${escapeSql(w.word)}, ${escapeSql(w.mean_1)}, ${escapeSql(w.mean_2)}, ${escapeSql(w.mean_3)}, ${escapeSql(w.example_sentence)})`;
            }).join(',\n');

            fs.appendFileSync(SQL_FILE_PATH, (isFirstInsert ? "" : ",\n") + sqlValues);
            isFirstInsert = false;

            currentSetTotal++;
            subLevelCounter++;
            if (subLevelCounter > setsPerSubLevel) {
                subLevelCounter = 1;
                subLevelIndex = Math.min(subLevelIndex + 1, conf.levels.length - 1);
                currentSetTotal = 1; // 새로운 레벨(예: middle_2)로 넘어가면 세트 번호 다시 1부터 시작할지 여부. 기존 양식에 맞춤
            }

            // 초당 요청 제한(Rate Limit) 방지를 위해 약간 대기
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    fs.appendFileSync(SQL_FILE_PATH, ';\n\n-- 데이터 생성 완료\n');
    console.log(`\n✅ 성공적으로 생성 완료되었습니다! 파일 경로: ${SQL_FILE_PATH}`);
    console.log(`기존 파일(seed.sql) 대신 새 파일(seed_new.sql)의 내용을 확인 후 덮어쓰거나 콘솔에서 실행하세요.`);
}

start();
