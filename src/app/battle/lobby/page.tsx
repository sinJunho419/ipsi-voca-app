'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import styles from './lobby.module.css'

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function LobbyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const level = searchParams.get('level') || 'elem_low'
    const setNo = searchParams.get('setNo') ? Number(searchParams.get('setNo')) : 1

    const [isPending, startTransition] = useTransition()
    const [joinCode, setJoinCode] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    // ── 방 만들기 ──
    async function handleCreateRoom() {
        startTransition(async () => {
            setErrorMsg('')

            // 현재 로그인된 유저 확인
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                setErrorMsg('로그인이 필요합니다. (입시내비 접속 필요)')
                return
            }

            const newCode = generateRoomCode()

            // battle_rooms 테이블에 Insert
            const { data, error } = await supabase
                .from('battle_rooms')
                .insert({
                    room_code: newCode,
                    host_id: user.id,
                    level,
                    set_no: setNo,
                    status: 'waiting',
                })
                .select('id')
                .single()

            if (error) {
                console.error('Room Creation Error:', error)
                setErrorMsg('방 생성에 실패했습니다.')
                return
            }

            // 대기실로 이동
            router.push(`/battle/room/${data.id}`)
        })
    }

    // ── 방 입장하기 ──
    async function handleJoinRoom() {
        if (!joinCode || joinCode.length !== 6) {
            setErrorMsg('6자리 코드를 입력해주세요.')
            return
        }

        startTransition(async () => {
            setErrorMsg('')

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setErrorMsg('로그인이 필요합니다.')
                return
            }

            // 코드에 해당하는 방 조회 (waiting 상태여야 함)
            const { data: room, error: findError } = await supabase
                .from('battle_rooms')
                .select('id, host_id, guest_id, status')
                .eq('room_code', joinCode.toUpperCase())
                .single()

            if (findError || !room) {
                setErrorMsg('존재하지 않는 방 코드입니다.')
                return
            }

            if (room.status !== 'waiting') {
                setErrorMsg('이미 게임이 진행 중이거나 종료된 방입니다.')
                return
            }

            if (room.host_id === user.id) {
                // 본인이 만든 방에 다시 들어가는 경우
                router.push(`/battle/room/${room.id}`)
                return
            }

            if (room.guest_id && room.guest_id !== user.id) {
                setErrorMsg('이미 다른 유저가 접속해 공간이 다 찼습니다.')
                return
            }

            // guest_id 업데이트를 통해 입장 처리
            const { error: updateError } = await supabase
                .from('battle_rooms')
                .update({ guest_id: user.id })
                .eq('id', room.id)

            if (updateError) {
                console.error('Room Join Error:', updateError)
                setErrorMsg('방 입장에 실패했습니다. 다시 시도해주세요.')
                return
            }

            router.push(`/battle/room/${room.id}`)
        })
    }

    return (
        <>
            {/* 배경 블롭 */}
            <div className={styles.blob1} />
            <div className={styles.blob2} />

            <motion.div
                className={styles.card}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <header className={styles.header}>
                    <h1 className={styles.title}>🏆 배틀 로비</h1>
                    <p className={styles.subtitle}>
                        레벨: {level} / 세트: {setNo}
                    </p>
                </header>

                {errorMsg && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={styles.error}
                            style={{ marginBottom: '0.5rem' }}
                        >
                            {errorMsg}
                        </motion.div>
                        {errorMsg.includes('로그인') && (
                            <button
                                className={styles.backBtn}
                                style={{ color: '#6366f1', textDecoration: 'underline', fontSize: '1rem' }}
                                onClick={() => router.push('/api/test-sso')}
                            >
                                ⚡ 테스트용 계정으로 자동 로그인
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.section}>
                    <p className={styles.sectionTitle}>새로운 배틀 시작하기</p>
                    <button
                        className={styles.btnPrimary}
                        onClick={handleCreateRoom}
                        disabled={isPending}
                    >
                        {isPending ? '방 생성 중...' : '방 만들기'}
                    </button>
                </div>

                <div className={styles.divider}>또는</div>

                <div className={styles.section}>
                    <p className={styles.sectionTitle}>친구 방에 코드 입력하고 입장</p>
                    <div className={styles.joinForm}>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="6자리 코드"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            className={styles.codeInput}
                            disabled={isPending}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                        />
                        <button
                            className={styles.btnSecondary}
                            onClick={handleJoinRoom}
                            disabled={isPending || joinCode.length !== 6}
                        >
                            입장
                        </button>
                    </div>
                </div>

                <button className={styles.backBtn} onClick={() => router.push('/study')}>
                    ← 뒤로 돌아가기
                </button>
            </motion.div>
        </>
    )
}

export default function BattleLobbyPage() {
    return (
        <div className={styles.page}>
            <Suspense fallback={<div className={styles.loader}>로딩 중...</div>}>
                <LobbyContent />
            </Suspense>
        </div>
    )
}
