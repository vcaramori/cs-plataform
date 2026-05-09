import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: contractId } = await context.params
    const { data: history } = await supabase
      .from("contract_negotiation_history")
      .select("*")
      .eq("contract_id", contractId)
      .order("date", { ascending: false })
    return NextResponse.json({ history })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: contractId } = await context.params
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { data: contract } = await supabase
      .from("contracts")
      .select("account_id")
      .eq("id", contractId)
      .single()

    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

    const { data: record } = await supabase
      .from("contract_negotiation_history")
      .insert({
        contract_id: contractId,
        account_id: contract.account_id,
        date: body.date || new Date().toISOString(),
        discount_offered_pct: body.discount_offered_pct || 0,
        discount_accepted_pct: body.discount_accepted_pct || 0,
        main_objection: body.main_objection,
        closing_argument: body.closing_argument,
        counterpart_name: body.counterpart_name,
        counterpart_role: body.counterpart_role,
        outcome: body.outcome,
        notes: body.notes,
        created_by: session.user.id,
      })
      .select()

    return NextResponse.json({ record: record?.[0] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}