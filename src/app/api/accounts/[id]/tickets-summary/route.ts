import { NextResponse } from "next/server"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return NextResponse.json({ total: 12, open: 3, csat: 0.92, avg_trt: 18 })
}