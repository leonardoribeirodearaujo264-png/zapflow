"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Zap, Eye, EyeOff, ArrowRight, Loader2, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (authError) throw authError

      if (data.user) {
        // Create workspace for the new user
        await supabase.from("workspaces").insert({
          name: `Workspace de ${name}`,
          owner_id: data.user.id,
          plan: "free",
        })
      }

      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar conta"
      if (message.includes("already registered")) {
        setError("Este email já está cadastrado")
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fade-in text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20">
            <Check className="h-8 w-8 text-[#00FF88]" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-[#E6EDF3] mb-2">Conta criada!</h2>
        <p className="text-sm text-[#8B949E]">Redirecionando para o dashboard...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
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
            Criar conta grátis
          </h2>
          <p className="text-sm text-[#8B949E] mt-1">
            Comece a automatizar seu WhatsApp com IA
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8B949E] mb-1.5">
              Seu nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João Silva"
              required
              className="w-full h-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#161B22] px-3 text-sm text-[#E6EDF3] placeholder:text-[#484F58] transition-all focus:outline-none focus:border-[rgba(0,255,136,0.5)] focus:shadow-[0_0_0_3px_rgba(0,255,136,0.1)]"
            />
          </div>

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
                placeholder="Mínimo 6 caracteres"
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
                Criar conta
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8B949E]">
          Já tem conta?{" "}
          <Link href="/login" className="text-[#00FF88] hover:underline font-medium">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
