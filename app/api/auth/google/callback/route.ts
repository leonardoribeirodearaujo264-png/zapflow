import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const workspaceId = req.nextUrl.searchParams.get("state")

  if (!code || !workspaceId) {
    return NextResponse.redirect(new URL("/calendar?error=oauth_failed", req.url))
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    const supabase = await createServiceClient()

    const { data: existing } = await supabase
      .from("google_oauth_tokens")
      .select("id")
      .eq("workspace_id", workspaceId)
      .single()

    if (existing) {
      await supabase.from("google_oauth_tokens").update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
      }).eq("id", existing.id)
    } else {
      await supabase.from("google_oauth_tokens").insert({
        workspace_id: workspaceId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
      })
    }

    return NextResponse.redirect(new URL("/calendar?connected=true", req.url))
  } catch {
    return NextResponse.redirect(new URL("/calendar?error=oauth_failed", req.url))
  }
}
