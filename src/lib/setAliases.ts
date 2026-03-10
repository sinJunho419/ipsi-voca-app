/**
 * 세트 별칭 (Alias) 상수
 * key: "타입:레벨:세트번호"  →  value: 표시할 별칭
 *
 * 단어 세트(word)는 별칭 없이 "Set N" 으로 표시,
 * 숙어 세트(idiom)만 별칭을 부여합니다.
 */

const ALIASES: Record<string, string> = {
    /* ── 중등 숙어 (set_no 21~) ── */
    // mid_1: 2세트 (40개)
    'idiom:mid_1:21': '기초 일상 숙어',
    'idiom:mid_1:22': '기초 학교 숙어',

    // mid_2: 3세트 (60개)
    'idiom:mid_2:21': '중급 생활 숙어',
    'idiom:mid_2:22': '중급 의사소통',
    'idiom:mid_2:23': '중급 독해 숙어',

    // mid_3: 3세트 (60개)
    'idiom:mid_3:21': '내신 필수 숙어 1',
    'idiom:mid_3:22': '내신 필수 숙어 2',
    'idiom:mid_3:23': '내신 고난도 숙어',

    /* ── 고등 숙어 (set_no 26~) ── */
    // high_1: 7세트 (140개)
    'idiom:high_1:26': '내신 필수 구문 1',
    'idiom:high_1:27': '내신 필수 구문 2',
    'idiom:high_1:28': '독해 핵심 숙어 1',
    'idiom:high_1:29': '독해 핵심 숙어 2',
    'idiom:high_1:30': '수능 빈출 구문 1',
    'idiom:high_1:31': '수능 빈출 구문 2',
    'idiom:high_1:32': '내신 고급 구문',

    // high_2: 8세트 (160개)
    'idiom:high_2:26': '수능 핵심 구문 1',
    'idiom:high_2:27': '수능 핵심 구문 2',
    'idiom:high_2:28': '수능 빈출 표현 1',
    'idiom:high_2:29': '수능 빈출 표현 2',
    'idiom:high_2:30': '고급 논술 구문 1',
    'idiom:high_2:31': '고급 논술 구문 2',
    'idiom:high_2:32': '수능 고난도 1',
    'idiom:high_2:33': '수능 고난도 2',
}

/**
 * 세트 별칭을 반환합니다.
 * 별칭이 없으면 null을 반환하므로, 호출 측에서 기본값을 사용하면 됩니다.
 */
export function getSetAlias(type: string, level: string, setNo: number): string | null {
    return ALIASES[`${type}:${level}:${setNo}`] ?? null
}

/**
 * UI에 표시할 세트 라벨을 반환합니다.
 * 별칭이 있으면 "Set 21 [기초 일상 숙어]", 없으면 "Set 1"
 */
export function getSetLabel(type: string, level: string, setNo: number): string {
    const alias = getSetAlias(type, level, setNo)
    return alias ? `Set ${setNo} [${alias}]` : `Set ${setNo}`
}
