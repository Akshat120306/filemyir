'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'
interface ToastItem { id: number; message: string; type: ToastType }
interface ToastCtx { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now()
    setItems(p => [...p, { id, message, type }])
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {items.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl pointer-events-auto"
            style={{ background: '#1E293B', border: '1px solid #2A3A55', color: '#F1F5F9', minWidth: 280 }}
          >
            {t.type === 'success'
              ? <CheckCircle size={16} style={{ color: '#22C55E', flexShrink: 0 }} />
              : <XCircle size={16} style={{ color: '#EF4444', flexShrink: 0 }} />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setItems(p => p.filter(i => i.id !== t.id))} style={{ color: '#64748B' }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
