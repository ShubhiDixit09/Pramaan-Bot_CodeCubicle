import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><CheckCircle2 size={25} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="alert error">
      <AlertTriangle size={18} />
      <span>{message}</span>
    </div>
  )
}

export function Loading({ label = 'Loading local data…' }: { label?: string }) {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={21} />
      <span>{label}</span>
    </div>
  )
}


