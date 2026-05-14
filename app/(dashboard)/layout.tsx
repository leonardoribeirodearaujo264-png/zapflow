import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ToastProvider } from "@/components/ui/toast"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <ToastProvider>
      <div className="h-screen bg-[#080B0F]">
        <Sidebar />
        <div
          className="flex flex-col h-screen"
          style={{ marginLeft: "240px", width: "calc(100% - 240px)" }}
        >
          <Header />
          <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
