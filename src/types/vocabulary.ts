/** words 테이블의 레벨 */
export type Level = 'elem_3' | 'elem_4' | 'elem_5' | 'elem_6' | 'mid_1' | 'mid_2' | 'mid_3' | 'high_1' | 'high_2'

/** 단어 타입 (word / idiom) */
export type WordType = 'word' | 'idiom'

/** words 테이블 행 타입 */
export interface Word {
    id: number
    type: string
    level: Level
    set_no: number
    word: string
    mean_1: string
    mean_2: string | null
    mean_3: string | null
    example_sentence: string | null
    created_at: string
}

/** battle_rooms 테이블의 상태 */
export type RoomStatus = 'waiting' | 'playing' | 'finished'

/** battle_rooms 테이블 행 타입 */
export interface BattleRoom {
    id: string               // uuid
    room_code: string        // 6자리 입장 코드
    host_id: number          // 방장 login_info_id
    guest_id: number | null  // (레거시) 1v1 참가자
    participant_ids: number[] // N인 참여자 목록 (방장 포함)
    max_players: number       // 최대 인원 (기본 50)
    level: Level
    set_no: number
    status: RoomStatus
    question_ids: number[] | null  // 셔플된 문제 ID 리스트
    finished_at: string | null     // 배틀 종료 시각
    created_at: string
}

/** 단어 학습 세션 상태 */
export interface StudySession {
    words: Word[]
    currentIndex: number
    isFlipped: boolean
}
