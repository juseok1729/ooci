export default function NotFound() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 8 }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>404</h1>
      <p style={{ opacity: 0.6 }}>이 주소에 연결된 페이지가 없습니다.</p>
    </main>
  )
}
