import { NextRequest, NextResponse } from "next/server";
import { verifyHelpDeskRequest } from "@/lib/integrations/helpdesk/auth"
import { autoAssignTickets } from "@/lib/support/auto-assign";

/**
 * POST /api/cron/auto-assign-tickets
 * Cron job endpoint for automatic ticket assignment
 * Runs every 5 minutes (every 5 minutes)
 *
 * Secured by: x-api-secret header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify API secret for cron job security
  if (!(await verifyHelpDeskRequest(request))) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid API secret" },
        { status: 401 }
      );
    }


    const result = await autoAssignTickets();

    if (!result.success) {
      console.error("[Cron: Auto-Assign] Job failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: "Auto-assign job failed",
        },
        { status: 500 }
      );
    }

    console.log(
      `[Cron: Auto-Assign] Job completed successfully. Assigned ${result.assigned} tickets`
    );

    return NextResponse.json({
      success: true,
      assigned: result.assigned,
      message: `Successfully assigned ${result.assigned} ticket(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron: Auto-Assign] Unexpected error:", error);
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
