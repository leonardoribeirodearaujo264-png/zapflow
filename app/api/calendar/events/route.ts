import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId, title, description, startDateTime, endDateTime, attendees } = body
    const supabase = await createClient()

    const { data: tokens } = await supabase
      .from("google_oauth_tokens")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single()

    if (!tokens) {
      return NextResponse.json({ error: "Google Calendar não conectado" }, { status: 400 })
    }

    let accessToken = tokens.access_token

    // Refresh token if expired
    if (new Date(tokens.expires_at) < new Date()) {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokens.refresh_token,
          grant_type: "refresh_token",
        }),
      })
      const refreshData = await refreshRes.json() as { access_token: string; expires_in: number }
      accessToken = refreshData.access_token
      const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000)
      await supabase.from("google_oauth_tokens").update({
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
      }).eq("id", tokens.id)
    }

    const eventBody = {
      summary: title,
      description: description || undefined,
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      attendees: attendees?.length ? attendees : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
        ],
      },
    }

    const calRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    )

    if (!calRes.ok) {
      const error = await calRes.text()
      throw new Error(`Google Calendar API: ${error}`)
    }

    const event = await calRes.json() as Record<string, unknown>

    await supabase.from("calendar_events").insert({
      workspace_id: workspaceId,
      google_event_id: event.id as string,
      calendar_id: "primary",
      title,
      description: description || null,
      start_time: new Date(startDateTime).toISOString(),
      end_time: new Date(endDateTime).toISOString(),
      attendees: attendees?.length ? JSON.stringify(attendees) : null,
    })

    return NextResponse.json(event)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
