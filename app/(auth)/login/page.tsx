"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login"
      setError(message === "Invalid login credentials" ? "Email ou senha incorretos" : message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20">
          <Zap className="h-5 w-5 text-[#00FF88]" />
        </div>
        <span className="text-2xl font-bold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
          Zap<span className="text-[#00FF88]">Flow</span>
        </span>
      </div>

      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(13,17,23,0.9)] backdrop-blur-sm p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#E6EDF3]" style={{ fontFamily: "'Sora', sans-serif" }}>
            Entrar na sua conta
          </h2>
          <p className="text-sm text-[#8B949E] mt-1">
            Bem-vindo de volta à sua plataforma de automação
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] transition-all focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 pr-10 text-sm text-[#E6EDF3] placeholder:text-[#484F58] transition-all focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484F58] hover:text-[#8B949E] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#F85149]/20 bg-[#F85149]/10 p-3 text-sm text-[#F85149]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-[#00FF88] text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-[#00CC6A] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8B949E]">
          Não tem conta?{" "}
          <Link href="/register" className="text-[#00FF88] hover:underline font-medium">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
