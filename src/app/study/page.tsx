import StudyClient from './StudyClient'

/**
 * 정적 페이지: 서버 쿼리 없이 즉시 렌더링
 * StudyClient가 level=null로 시작하므로 서버 데이터 불필요
 */
export default function StudyPage() {
    return (
        <StudyClient
            initialWords={[]}
            initialMaxSet={1}
        />
    )
}
