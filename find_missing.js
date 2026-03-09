const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'supabase', 'seed.sql');
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

let emptyMeans = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("('word',") && !line.startsWith("--")) {
        const match = line.match(/^\s*\('word',\s*'[^']+',\s*\d+,\s*'([^']+)',\s*([^,]+)/);
        if (match) {
            const word = match[1];
            const mean1 = match[2].trim();

            if (mean1 === 'NULL' || mean1 === "''" || mean1.toLowerCase() === "'null'") {
                emptyMeans.push({ lineNum: i + 1, word, mean1, line });
            }
        }
    }
}

console.log(JSON.stringify(emptyMeans, null, 2));
