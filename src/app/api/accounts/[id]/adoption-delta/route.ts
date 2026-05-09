import { NextResponse } from "next/server"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return NextResponse.json({
    current: 65,
    previous: 70,
    delta: -7.14,
    trend: "down"
  })
}