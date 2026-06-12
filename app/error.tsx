'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
        <p style={{ marginBottom: 20, opacity: 0.7 }}>
          An unexpected error occurred. Your data is safe — try again or reload the page.
        </p>
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
          Try again
        </button>
      </div>
    </div>
  )
}
