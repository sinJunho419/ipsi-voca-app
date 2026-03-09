const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'supabase', 'seed.sql');
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
let modified = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 예: ('word', 'high_3', 55, 'zum', NULL, NULL, NULL, 'The "마스터 챌린지" ...')
    if (line.includes("('word',") && line.includes("NULL,")) {
        // line parsing: matching "('word', '{level}', {setNo}, '{word}', {mean_1}, {mean_2}, {mean_3}, {example})"
        // A simple regex approach to find NULL as the 5th element:
        // "('word', '...', 123, 'wordstr', NULL,"
        const regex = /(\s*\('word',\s*'[^']+',\s*\d+,\s*'[^']+',\s*)NULL(\s*,.*)/;
        if (regex.test(line)) {
            lines[i] = line.replace(regex, "$1'단어 뜻 누락'$2");
            modified = true;
            console.log(`Fixing line ${i + 1}: ${lines[i].substring(0, 50)}...`);
        }
    }
}

if (modified) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log("✅ seed.sql 널값 정리 완료!");
} else {
    console.log("변경할 항목이 없습니다.");
}
