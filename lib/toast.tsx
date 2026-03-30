'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastCtx { show: (message: string, type?: ToastType) => void }
const Ctx = createContext<ToastCtx>({ show: () => {} })
export function useToast() { return useContext(Ctx) }

let _id = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_id
    setToasts(p => [...p, { id, message, type }].slice(-3))
    setTimeout(() => remove(id), 3500)
  }, [remove])

  const ICON = { success: '✓', error: '✕', info: 'ℹ' }
  const CLR = {
    success: { border: '#5db87a', ic: '#5db87a', bg: 'rgba(93,184,122,0.08)' },
    error:   { border: '#e85d4a', ic: '#e85d4a', bg: 'rgba(232,93,74,0.08)' },
    info:    { border: '#e8c547', ic: '#e8c547', bg: 'rgba(232,197,71,0.08)' },
  }

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8, pointerEvents: 'none', alignItems: 'flex-end' }}>
        {toasts.map(t => {
          const c = CLR[t.type]
          return (
            <div key={t.id} className="toast-slide" style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: '12px 16px',
              color: '#f0ece4', fontSize: 13,
              boxShadow: '0 4px 24px rgba(0,0,0,.5)',
              pointerEvents: 'all',
              fontFamily: 'DM Sans, sans-serif',
              minWidth: 260, maxWidth: 360,
            }}>
              <span style={{ color: c.ic, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>{ICON[t.type]}</span>
              <span style={{ flex: 1, lineHeight: 1.45 }}>{t.message}</span>
              <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, padding: 0, flexShrink: 0, lineHeight: 1, marginTop: -1 }}>×</button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
