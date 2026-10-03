'use client'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info' | 'warning'
type Toast = { id: number; tone: ToastTone; title: string; description?: string }

type ToastApi = {
  toast: (tone: ToastTone, title: string, description?: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}

const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
const tones: Record<ToastTone, string> = {
  success: 'text-ok',
  error: 'text-danger',
  info: 'text-brand-500',
  warning: 'text-warn',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, tone, title, description }])
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast('success', title, description),
      error: (title, description) => toast('error', title, description),
      info: (title, description) => toast('info', title, description),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
        role="region"
        aria-live="polite"
      >
        {toasts.map((item) => {
          const Icon = icons[item.tone]
          return (
            <div
              key={item.id}
              className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-line bg-elevated p-3.5 shadow-pop"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tones[item.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{item.title}</p>
                {item.description && <p className="mt-0.5 break-words text-xs text-muted">{item.description}</p>}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 text-faint hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
