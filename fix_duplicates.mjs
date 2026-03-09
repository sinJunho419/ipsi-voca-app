import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDFjbOUfabXFBV1xT4fEPKYn9dkv2rzVxM";
const SQL_FILE_PATH = path.join(process.cwd(), 'supabase', 'seed.sql');

async function fixDuplicates() {
    console.log("🚀 중복 단어 검색 및 수정 시작...");

    // 1. 파일 읽기
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, 'utf-8');
    const lines = sqlContent.split('\n');

    // 단어 중복 추적
    const seenWords = new Set();
    const duplicateIndexes = [];
    const parsedLines = [];

    let inValues = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('INSERT INTO public.words')) {
            inValues = true;
            continue;
        }

        if (inValues && line.trim().startsWith("('word',") || line.trim().startsWith("('word',")) {
            // 파싱
            const match = line.match(/\s*\('word',\s*'([^']+)',\s*(\d+),\s*'([^']+)',(.*)/);
            if (match) {
                const level = match[1];
                const setNo = match[2];
                let word = match[3];

                if (seenWords.has(word.toLowerCase())) {
                    // 중복 발견!
                    duplicateIndexes.push({ index: i, level, setNo, word, matchStr: match[0], originalLine: line });
                } else {
                    seenWords.add(word.toLowerCase());
                }
            }
        }
    }

    console.log(`🔍 총 ${duplicateIndexes.length}개의 중복 단어가 발견되었습니다.`);

    if (duplicateIndexes.length === 0) {
        console.log("✅ 완료: 중복된 단어가 없습니다.");
        return;
    }

    // 중복 단어를 교체하기 위해 level/set 묶기
    const replacementsNeeded = {}; // "level_set": [{index, originalLine, word}, ...]
    for (const dup of duplicateIndexes) {
        const key = `${dup.level}_${dup.setNo}`;
        if (!replacementsNeeded[key]) replacementsNeeded[key] = [];
        replacementsNeeded[key].push(dup);
    }

    let finalLines = [...lines];
    const allWordListStr = Array.from(seenWords).join(', ');

    async function generateReplacement(level, setNo, count) {
        const isElem = level.startsWith('elem');
        const hasExample = !isElem;

        // 너무 많은 seenWords를 다 보내면 토큰 초과가 날 수 있으니, "겹치지 않게" 프롬프트를 줍니다.
        const prompt = `당신은 영어 단어 생성기입니다. ${level} 레벨(세트 ${setNo})에 적합한 서로 다른 영어 단어 ${count}개를 JSON 배열 형태로만 출력하세요.
다음 리스트에 포함된 단어들은 이미 데이터베이스에 있으므로 절대로 포함해서는 안 됩니다:
[${Array.from(seenWords).join(', ')}]
(위 단어 리스트와 절대로 겹치지 않는 새로운 단어를 생성하세요.)
절대 출력에 마크다운 백틱(\`\`\`)이나 추가 설명을 포함하지 마세요.

조건:
1. "word": 새로운 영단어
2. "mean_1": 가장 대표적인 한글 뜻
3. "mean_2": 두 번째 뜻 (선택적, 없으면 null)
4. "mean_3": 세 번째 뜻 (선택적, 없으면 null)
5. "example_sentence": ${hasExample ? `"마스터 챌린지"를 위한 완전히 고유한 예문` : `null (초등은 예문 없음)`}

예시 포맷:
[
  { "word": "unique", "mean_1": "독특한", "mean_2": null, "mean_3": null, "example_sentence": ${hasExample ? '"The unique painting was sold."' : 'null'} }
]
`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.9, responseMimeType: "application/json" }
            }),
        });

        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }

        const data = await response.json();
        const txt = data.candidates[0].content.parts[0].text;
        try {
            return JSON.parse(txt);
        } catch (e) {
            console.error("JSON 파싱 에러:", txt);
            throw e;
        }
    }

    function escapeSql(str) {
        if (str === null || str === undefined) return 'NULL';
        if (typeof str === 'string') return "'" + str.replace(/'/g, "''") + "'";
        return str;
    }

    // 중복 교체 진행
    for (const key of Object.keys(replacementsNeeded)) {
        const items = replacementsNeeded[key];
        const [level, setNo] = key.split('_');
        const levelName = `${level}_${key.split('_')[1]}`; // level can have multiple underscores e.g. middle_1
        const actualLevel = key.substring(0, key.lastIndexOf('_'));
        const actualSetNo = key.substring(key.lastIndexOf('_') + 1);

        console.log(`🔄 [${key}] 중복 단어 ${items.length}개 교체 중...`);

        let retries = 3;
        let newWords = null;
        while (retries > 0) {
            try {
                newWords = await generateReplacement(actualLevel, actualSetNo, items.length);

                // 중복 체크 (또 겹치면 재시도)
                const overlaps = newWords.some(w => seenWords.has(w.word.toLowerCase()));
                if (overlaps && retries > 1) {
                    console.log("  ⚠️ 새로 생성된 단어 중에 또 중복이 있어서 다시 시도합니다.");
                    retries--;
                    continue;
                }

                break; // 성공
            } catch (e) {
                console.error("  에러 발생, 재시도...", e.message);
                retries--;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (!newWords) {
            console.error(`❌ [${key}] 삭제: 새로운 단어 생성 실패`);
            continue;
        }

        // 파일 내 라인 교체
        for (let j = 0; j < items.length; j++) {
            const newLine = newWords[j];
            if (!newLine) break; // 혹시 개수가 모자랄 경우

            seenWords.add(newLine.word.toLowerCase()); // 새로 추가된 단어도 중복 방지 셋팅

            const lineIdx = items[j].index;
            // 기존 라인의 콤마/세미콜론 등 끝부분 유지
            const endsWithComma = finalLines[lineIdx].trim().endsWith(',');
            const endsWithSemicolon = finalLines[lineIdx].trim().endsWith(';');

            let suffix = '';
            if (endsWithComma) suffix = ',';
            else if (endsWithSemicolon) suffix = ';';

            finalLines[lineIdx] = `  ('word', '${actualLevel}', ${actualSetNo}, ${escapeSql(newLine.word)}, ${escapeSql(newLine.mean_1)}, ${escapeSql(newLine.mean_2)}, ${escapeSql(newLine.mean_3)}, ${escapeSql(newLine.example_sentence)})${suffix}`;
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    fs.writeFileSync(SQL_FILE_PATH, finalLines.join('\n'));
    console.log("✅ 모든 중복 단어가 새로운 단어로 교체되어 seed.sql에 저장되었습니다.");
}

fixDuplicates();
