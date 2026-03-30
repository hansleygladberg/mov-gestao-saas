import React from 'react'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  action?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.35 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#f0ece4', marginBottom: 8, fontFamily: 'Syne, sans-serif' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 320, marginBottom: action ? 24 : 0 }}>{subtitle}</div>
      {action && onAction && (
        <button onClick={onAction} style={{
          padding: '9px 20px', background: '#e8c547', color: '#000',
          border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'Syne, sans-serif',
        }}>
          {action}
        </button>
      )}
    </div>
  )
}
