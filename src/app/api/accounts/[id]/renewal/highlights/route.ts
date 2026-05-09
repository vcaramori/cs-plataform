import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: accountId } = await context.params
    const highlights = ["Milestone 1: Strong health score trajectory", "Milestone 2: Positive customer sentiment", "Milestone 3: Ready for renewal discussion"]
    return NextResponse.json({ highlights })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}