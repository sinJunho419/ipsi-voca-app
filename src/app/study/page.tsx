import { Suspense } from 'react'
import StudyClient from './StudyClient'

/**
 * 정적 페이지: 서버 쿼리 없이 즉시 렌더링
 * Suspense: useSearchParams() 사용을 위해 필요
 */
export default function StudyPage() {
    return (
        <Suspense>
            <StudyClient
                initialWords={[]}
                initialMaxSet={1}
            />
        </Suspense>
    )
}
