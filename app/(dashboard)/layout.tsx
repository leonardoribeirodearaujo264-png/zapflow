import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ToastProvider } from "@/components/ui/toast"
import { SidebarProvider } from "@/components/sidebar-context"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <ToastProvider>
      <SidebarProvider>
        <div className="flex h-screen bg-[#070B10] overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ToastProvider>
  )
}
