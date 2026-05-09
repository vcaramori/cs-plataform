import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export const maxDuration = 120

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await context.params
    const html = "<html><body><h1>Renewal Brief</h1><p>Executive summary...</p></body></html>"
    const filename = `renewal-${Date.now()}.html`
    return NextResponse.json({ html, filename })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}