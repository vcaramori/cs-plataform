import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, account_id, renewal_date, arr, accounts(name, health_score_v2)")
      .in("status", ["active", "at-risk"])

    if (!contracts) {
      return NextResponse.json({ data: { critical: [], urgent: [], planning: [] } })
    }

    const today = new Date()
    const critical = []
    const urgent = []
    const planning = []

    for (const contract of contracts) {
      const daysToRenewal = Math.ceil(
        (new Date(contract.renewal_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysToRenewal > 90) continue

      const item = {
        id: contract.id,
        account_id: contract.account_id,
        account_name: contract.accounts?.name,
        arr: contract.arr,
        health_score: contract.accounts?.health_score_v2 || 0,
        nps: null,
        readiness_color:
          contract.accounts?.health_score_v2 >= 75 ? "green" :
          contract.accounts?.health_score_v2 >= 50 ? "yellow" : "red"
      }

      if (daysToRenewal < 30) {
        critical.push(item)
      } else if (daysToRenewal < 60) {
        urgent.push(item)
      } else {
        planning.push(item)
      }
    }

    return NextResponse.json({
      data: {
        critical: critical.sort((a, b) => b.arr - a.arr),
        urgent: urgent.sort((a, b) => b.arr - a.arr),
        planning: planning.sort((a, b) => b.arr - a.arr),
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}