import { NextRequest, NextResponse } from "next/server";
import { escalateSLAViolations } from "@/lib/support/sla-escalation";

/**
 * POST /api/cron/escalate-sla-violations
 * Cron job endpoint for SLA escalation notifications
 * Runs hourly (every hour)
 *
 * Secured by: x-api-secret header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API secret for cron job security
    const apiSecret = request.headers.get("x-api-secret");
    if (apiSecret !== process.env.API_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API secret" },
        { status: 401 }
      );
    }

    console.log(
      "[Cron: SLA Escalation] Starting SLA violation escalation job"
    );

    const result = await escalateSLAViolations();

    if (!result.success) {
      console.error("[Cron: SLA Escalation] Job failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: "SLA escalation job failed",
        },
        { status: 500 }
      );
    }

    console.log(
      `[Cron: SLA Escalation] Job completed successfully. Escalated ${result.escalated} ticket(s)`
    );

    return NextResponse.json({
      success: true,
      escalated: result.escalated,
      message: `Successfully escalated ${result.escalated} ticket(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron: SLA Escalation] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// HEAD request for health check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
