import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ZapFlow — Automação WhatsApp com IA",
  description: "Plataforma SaaS premium de automação via WhatsApp com IA multi-provider",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-[#080B0F] text-[#E6EDF3] antialiased">
        {children}
      </body>
    </html>
  )
}
