import { redirect } from 'next/navigation'

/**
 * 루트 경로(/)로 접속하면 /study로 자동 이동
 */
export default function Home() {
  redirect('/study')
}
