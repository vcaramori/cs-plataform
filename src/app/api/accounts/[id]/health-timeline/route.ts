import { NextResponse } from "next/server"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const months = 12
  const data = Array.from({ length: months }, (_, i) => ({
    date: new Date(2025, new Date().getMonth() - i, 1).toLocaleDateString("pt-BR"),
    health_score_v2: Math.floor(Math.random() * 30) + 60
  })).reverse()
  return NextResponse.json({ data })
}