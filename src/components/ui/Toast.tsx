import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

type ToastContextType = {
  toasts: ToastMessage[]
  addToast: (type: ToastMessage['type'], message: string) => void
  removeToast: (id: string) => void
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

function Toast({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-[slideLeft_0.2s_ease-out] border',
        'bg-white text-gray-900',
        toast.type === 'error' ? 'border-red-200 shadow-red-500/20' : 
        toast.type === 'success' ? 'border-emerald-200 shadow-emerald-500/20' :
        'border-blue-200 shadow-blue-500/20'
      )}
    >
      {icons[toast.type]}
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="text-gray-500 hover:text-gray-700 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastMessage['type'], message: string) => {
      const id = String(Date.now() + Math.random())
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => removeToast(id), 4000)
    },
    [removeToast]
  )

  const success = useCallback((msg: string) => addToast('success', msg), [addToast])
  const error = useCallback((msg: string) => addToast('error', msg), [addToast])
  const info = useCallback((msg: string) => addToast('info', msg), [addToast])

  const value = useMemo(
    () => ({ toasts, addToast, removeToast, success, error, info }),
    [toasts, addToast, removeToast, success, error, info]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// Optional container for legacy use
export function ToastContainer({ toasts, onClose }: { toasts: ToastMessage[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  )
}

