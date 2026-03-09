/** words 테이블의 레벨 */
export type Level = 'elem_3' | 'elem_4' | 'elem_5' | 'elem_6' | 'high_1'

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
    created_at: string
}

/** battle_rooms 테이블의 상태 */
export type RoomStatus = 'waiting' | 'playing' | 'finished'

/** battle_rooms 테이블 행 타입 */
export interface BattleRoom {
    id: string               // uuid
    room_code: string        // 6자리 입장 코드
    host_id: string          // 방장 user_id
    guest_id: string | null  // 참가자 user_id
    level: Level
    set_no: number
    status: RoomStatus
    host_score: number
    guest_score: number
    created_at: string
}

/** 단어 학습 세션 상태 */
export interface StudySession {
    words: Word[]
    currentIndex: number
    isFlipped: boolean
}
