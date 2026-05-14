"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { Check, X, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const icons = {
    success: <Check className="h-4 w-4" />,
    error: <X className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  }

  const colors = {
    success: "border-[#3FB950]/30 bg-[#3FB950]/10 text-[#3FB950]",
    error: "border-[#F85149]/30 bg-[#F85149]/10 text-[#F85149]",
    warning: "border-[#D29922]/30 bg-[#D29922]/10 text-[#D29922]",
    info: "border-[#58A6FF]/30 bg-[#58A6FF]/10 text-[#58A6FF]",
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg",
              "backdrop-blur-sm pointer-events-auto",
              "animate-in slide-in-from-right-4 fade-in duration-200",
              colors[t.type]
            )}
          >
            {icons[t.type]}
            <span className="text-[#E6EDF3]">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
