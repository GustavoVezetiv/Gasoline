'use client'
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return <main className="shell page"><h1>Não foi possível carregar esta página</h1><p className="muted">Verifique sua conexão e tente novamente.</p><button className="primary-button" onClick={reset}>Tentar novamente</button></main>
}
