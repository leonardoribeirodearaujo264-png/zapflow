"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SidebarContextType {
  open: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType>({ open: true, toggle: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <SidebarContext.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
