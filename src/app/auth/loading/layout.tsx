import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '입시보카',
}

export default function AuthLoadingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: '#fff',
            overflow: 'hidden',
        }}>
            {children}
        </div>
    )
}
