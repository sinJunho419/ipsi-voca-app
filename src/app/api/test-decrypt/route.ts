import { NextRequest, NextResponse } from 'next/server'

/** XOR 복호화 */
function xorDecrypt(encrypted: Buffer, key: string): string {
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(encrypted.length)
    for (let i = 0; i < encrypted.length; i++) {
        result[i] = encrypted[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('utf8')
}

/** XOR 암호화 → Base64 */
function xorEncryptToBase64(plaintext: string, key: string): string {
    const textBytes = Buffer.from(plaintext, 'utf8')
    const keyBytes = Buffer.from(key, 'utf8')
    const result = Buffer.alloc(textBytes.length)
    for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length]
    }
    return result.toString('base64')
}

export async function GET(request: NextRequest) {
    const payload = request.nextUrl.searchParams.get('payload') || ''

    const secretKey = process.env.VOCA_SECRET_KEY?.trim()
    if (!secretKey) {
        return jsonResponse({ error: 'VOCA_SECRET_KEY 미설정' })
    }

    if (!payload) {
        return jsonResponse({ error: 'payload 파라미터가 없습니다. ?payload=... 로 전달해주세요' })
    }

    try {
        // 1. 복호화
        const encrypted = Buffer.from(payload, 'base64')
        const decrypted = xorDecrypt(encrypted, secretKey)
        const parts = decrypted.split('|')

        // 2. 다시 암호화 (입시내비로 보낼 값)
        const reEncrypted = xorEncryptToBase64(decrypted, secretKey)

        return jsonResponse({
            '1_받은_payload': payload,
            '2_복호화_결과': decrypted,
            '3_파이프_split': parts,
            '4_nid': parts[0] || '(없음)',
            '5_name': parts[1] || '(없음)',
            '6_timestamp': parts[2] || '(없음)',
            '7_재암호화_payload': reEncrypted,
            '8_원본과_재암호화_일치': payload === reEncrypted,
        })
    } catch (e) {
        return jsonResponse({ error: '처리 실패', detail: String(e) })
    }
}

export async function POST(request: NextRequest) {
    const contentType = request.headers.get('content-type') || ''
    let payload = ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData()
        payload = (formData.get('payload') as string) || ''
    } else {
        const body = await request.json()
        payload = body.payload || ''
    }

    const secretKey = process.env.VOCA_SECRET_KEY?.trim()
    if (!secretKey) {
        return jsonResponse({ error: 'VOCA_SECRET_KEY 미설정' })
    }

    if (!payload) {
        return jsonResponse({ error: 'payload 값이 없습니다' })
    }

    try {
        const encrypted = Buffer.from(payload, 'base64')
        const decrypted = xorDecrypt(encrypted, secretKey)
        const parts = decrypted.split('|')

        const reEncrypted = xorEncryptToBase64(decrypted, secretKey)

        return jsonResponse({
            '1_받은_payload': payload,
            '2_복호화_결과': decrypted,
            '3_파이프_split': parts,
            '4_nid': parts[0] || '(없음)',
            '5_name': parts[1] || '(없음)',
            '6_timestamp': parts[2] || '(없음)',
            '7_재암호화_payload': reEncrypted,
            '8_원본과_재암호화_일치': payload === reEncrypted,
        })
    } catch (e) {
        return jsonResponse({ error: '처리 실패', detail: String(e) })
    }
}

function jsonResponse(data: Record<string, unknown>) {
    return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
}
