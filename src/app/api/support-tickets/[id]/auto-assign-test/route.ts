import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/support-tickets/[id]/auto-assign-test
 * Force auto-assignment of a specific ticket (admin only for testing)
 *
 * Request body: { csm_id?: string } (optional: force specific CSM)
 *
 * Response:
 * {
 *   ticket_id: string,
 *   assigned_to_csm_id: string,
 *   assigned_to_csm_name: string,
 *   capacity_before: number,
 *   capacity_after: number,
 *   message: string
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth('manage:admin');
    if (isAuthError(auth)) return auth;

    const supabase = getSupabaseAdminClient();
    const params = await context.params;
    const ticketId = params.id;
    const { csm_id: forcedCsmId } = await request.json().catch(() => ({}));

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, assigned_to, title")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Get available CSMs with capacity
    let targetCSM;

    if (forcedCsmId) {
      // Use forced CSM (ignoring capacity check for testing)
      const { data: csmData, error: csmError } = await supabase
        .from("csm_queue_stats")
        .select("csm_id, csm_name, assigned_count, max_capacity")
        .eq("csm_id", forcedCsmId)
        .single();

      if (csmError || !csmData) {
        return NextResponse.json(
          { error: "CSM not found" },
          { status: 404 }
        );
      }

      targetCSM = csmData;
    } else {
      // Find CSM with lowest queue and available capacity
      const { data: csmsData, error: csmsError } = await supabase
        .from("csm_queue_stats")
        .select("csm_id, csm_name, assigned_count, max_capacity")
        .eq("status", "active")
        .order("assigned_count", { ascending: true })
        .limit(1)
        .single();

      if (csmsError || !csmsData) {
        return NextResponse.json(
          { error: "No CSMs available" },
          { status: 400 }
        );
      }

      targetCSM = csmsData;
    }

    const capacityBefore = targetCSM.assigned_count || 0;
    const capacityAfter = capacityBefore + 1;

    // Assign ticket
    const { error: updateError } = await supabase
      .from("support_tickets")
      .update({
        assigned_to: targetCSM.csm_id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to assign ticket", details: updateError },
        { status: 500 }
      );
    }

    // Record in auto_assign_stats
    await supabase.from("auto_assign_stats").insert({
      assigned_ticket_id: ticketId,
      assigned_to_csm_id: targetCSM.csm_id,
      capacity_before: capacityBefore,
      capacity_after: capacityAfter,
    });

    // Log event
    await supabase.from("ticket_events").insert({
      ticket_id: ticketId,
      event_type: "auto_assigned",
      responsible_csm_id: targetCSM.csm_id,
      payload: {
        assigned_to_csm_name: targetCSM.csm_name,
        test: true,
      },
    });

    return NextResponse.json({
      ticket_id: ticketId,
      assigned_to_csm_id: targetCSM.csm_id,
      assigned_to_csm_name: targetCSM.csm_name,
      capacity_before: capacityBefore,
      capacity_after: capacityAfter,
      message: `Ticket assigned to ${targetCSM.csm_name} (${capacityAfter}/${targetCSM.max_capacity})`,
    });
  } catch (error) {
    console.error("[Auto-Assign Test] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
