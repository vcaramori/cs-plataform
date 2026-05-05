/**
 * Auto-Assign Tickets Cron Job
 * Runs every 5 minutes (every 5 minutes via cron)
 * Assigns unassigned tickets to CSM with the lowest queue load
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CSMCapacity {
  csm_id: string;
  csm_name: string;
  assigned_count: number;
  max_capacity: number;
  available_slots: number;
  load_percentage: number;
  auto_assign_enabled: boolean;
}

interface UnassignedTicket {
  id: string;
  title: string;
  account_id: string;
}

async function getAvailableCSMs(): Promise<CSMCapacity[]> {
  const { data, error } = await supabase
    .from("csm_queue_stats")
    .select(
      `
      csm_id,
      csm_name,
      assigned_count,
      max_capacity,
      available_slots,
      load_percentage,
      status
    `
    )
    .eq("status", "active")
    .order("assigned_count", { ascending: true });

  if (error) {
    console.error("[Auto-Assign] Error fetching CSM capacity:", error);
    return [];
  }

  // Get auto_assign_enabled settings
  const csmsWithSettings: CSMCapacity[] = [];

  for (const csm of data || []) {
    const { data: settings, error: settingsError } = await supabase
      .from("csm_settings")
      .select("auto_assign_enabled")
      .eq("user_id", csm.csm_id)
      .single();

    if (settingsError) {
      console.warn(
        `[Auto-Assign] No settings found for CSM ${csm.csm_id}, defaulting to enabled`
      );
    }

    csmsWithSettings.push({
      csm_id: csm.csm_id,
      csm_name: csm.csm_name,
      assigned_count: csm.assigned_count || 0,
      max_capacity: csm.max_capacity || 20,
      available_slots: csm.available_slots || 20,
      load_percentage: csm.load_percentage || 0,
      auto_assign_enabled: settings?.auto_assign_enabled !== false,
    });
  }

  // Filter CSMs with available capacity and auto_assign enabled
  return csmsWithSettings.filter(
    (csm) => csm.available_slots > 0 && csm.auto_assign_enabled
  );
}

async function getUnassignedTickets(): Promise<UnassignedTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, title, account_id")
    .is("assigned_to", null)
    .eq("status", "open")
    .limit(50); // Process max 50 per run

  if (error) {
    console.error("[Auto-Assign] Error fetching unassigned tickets:", error);
    return [];
  }

  return data || [];
}

async function assignTicket(
  ticketId: string,
  csmId: string,
  csmName: string,
  capacityBefore: number,
  capacityAfter: number
): Promise<boolean> {
  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({
      assigned_to: csmId,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (updateError) {
    console.error(
      `[Auto-Assign] Failed to assign ticket ${ticketId}:`,
      updateError
    );
    return false;
  }

  // Record in auto_assign_stats
  const { error: statsError } = await supabase
    .from("auto_assign_stats")
    .insert({
      assigned_ticket_id: ticketId,
      assigned_to_csm_id: csmId,
      capacity_before: capacityBefore,
      capacity_after: capacityAfter,
    });

  if (statsError) {
    console.warn(
      `[Auto-Assign] Failed to record stats for ticket ${ticketId}:`,
      statsError
    );
  }

  // Log event
  const { error: eventError } = await supabase
    .from("ticket_events")
    .insert({
      ticket_id: ticketId,
      event_type: "auto_assigned",
      responsible_csm_id: csmId,
      payload: {
        assigned_to_csm_name: csmName,
      },
    });

  if (eventError) {
    console.warn(
      `[Auto-Assign] Failed to log event for ticket ${ticketId}:`,
      eventError
    );
  }

  console.log(`[Auto-Assign] ✓ Assigned ticket ${ticketId} to ${csmName}`);
  return true;
}

export async function autoAssignTickets() {
  try {
    console.log("[Auto-Assign] Starting auto-assignment job...");

    const availableCSMs = await getAvailableCSMs();
    if (availableCSMs.length === 0) {
      console.log("[Auto-Assign] No CSMs available for assignment");
      return { success: true, assigned: 0 };
    }

    const unassignedTickets = await getUnassignedTickets();
    if (unassignedTickets.length === 0) {
      console.log("[Auto-Assign] No unassigned tickets found");
      return { success: true, assigned: 0 };
    }

    let assignedCount = 0;

    for (const ticket of unassignedTickets) {
      // Find CSM with lowest queue
      const bestCSM = availableCSMs.reduce((prev, current) =>
        current.assigned_count < prev.assigned_count ? current : prev
      );

      // Check if still has capacity
      if (bestCSM.available_slots <= 0) {
        console.log(
          `[Auto-Assign] CSM ${bestCSM.csm_name} no longer has capacity`
        );
        continue;
      }

      const capacityBefore = bestCSM.assigned_count;
      const capacityAfter = capacityBefore + 1;

      const success = await assignTicket(
        ticket.id,
        bestCSM.csm_id,
        bestCSM.csm_name,
        capacityBefore,
        capacityAfter
      );

      if (success) {
        assignedCount++;
        // Update CSM capacity tracking
        bestCSM.assigned_count++;
        bestCSM.available_slots--;
      }
    }

    console.log(
      `[Auto-Assign] ✓ Job completed. Assigned ${assignedCount} tickets`
    );
    return { success: true, assigned: assignedCount };
  } catch (error) {
    console.error("[Auto-Assign] Cron job failed:", error);
    return { success: false, error: String(error) };
  }
}

// Entry point for deployment
if (require.main === module) {
  autoAssignTickets().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}
