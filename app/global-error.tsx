'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <h2 style={{ marginBottom: 8 }}>PesaMali hit an unexpected error</h2>
          <p style={{ marginBottom: 20, opacity: 0.7 }}>Reload to get back to your dashboard.</p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#4F46E5',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
