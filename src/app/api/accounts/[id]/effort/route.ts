import { NextResponse } from "next/server"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const data = [
    { type: "preparation", hours: 120 },
    { type: "strategy", hours: 85 },
    { type: "meetings", hours: 160 },
    { type: "reporting", hours: 65 },
  ]
  return NextResponse.json({ data })
}