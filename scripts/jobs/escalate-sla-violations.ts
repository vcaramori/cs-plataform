/**
 * SLA Escalation Cron Job
 * Runs hourly (every hour via cron)
 * Notifies manager when SLA is critical via Slack
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CriticalTicket {
  ticket_id: string;
  ticket_title: string;
  account_name: string;
  assigned_csm_id: string;
  assigned_csm_name: string;
  priority: string;
  sla_status: "vencido" | "atencao";
  hours_elapsed: number;
  deadline_at: string;
}

interface SlackMessage {
  text: string;
  blocks: any[];
}

async function getCriticalTickets(): Promise<CriticalTicket[]> {
  const { data: ticketsData, error } = await supabase
    .from("support_tickets")
    .select(
      `
      id,
      title,
      priority,
      assigned_to,
      created_at,
      account_id,
      sla_events (
        sla_status_resolution,
        deadline_resolution
      )
    `
    )
    .neq("status", "closed")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[SLA Escalation] Error fetching critical tickets:", error);
    return [];
  }

  const criticalTickets: CriticalTicket[] = [];

  for (const ticket of ticketsData || []) {
    const slaEvent = ticket.sla_events?.[0];
    if (!slaEvent) continue;

    const slaStatus = slaEvent.sla_status_resolution;
    if (slaStatus !== "vencido" && slaStatus !== "atencao") continue;

    // Fetch account and CSM details separately
    const { data: accountData } = await supabase
      .from("accounts")
      .select("name")
      .eq("id", ticket.account_id)
      .single();

    const { data: csmData } = await supabase
      .from("auth.users")
      .select("full_name")
      .eq("id", ticket.assigned_to)
      .single();

    const hoursElapsed =
      (new Date().getTime() - new Date(ticket.created_at).getTime()) /
      (1000 * 60 * 60);

    criticalTickets.push({
      ticket_id: ticket.id,
      ticket_title: ticket.title,
      account_name: accountData?.name || "Unknown Account",
      assigned_csm_id: ticket.assigned_to,
      assigned_csm_name: csmData?.full_name || "Unassigned",
      priority: ticket.priority || "medium",
      sla_status: slaStatus,
      hours_elapsed: hoursElapsed,
      deadline_at: slaEvent.deadline_resolution,
    });
  }

  return criticalTickets;
}

function buildSlackMessage(ticket: CriticalTicket): SlackMessage {
  const emoji = ticket.sla_status === "vencido" ? "🚨" : "⚠️";
  const statusText =
    ticket.sla_status === "vencido" ? "VENCIDO" : "EM ATENÇÃO";

  const deadlineDate = new Date(ticket.deadline_at);
  const now = new Date();
  const hoursDifference = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const timeText =
    hoursDifference < 0
      ? `vencido há ${Math.abs(Math.floor(hoursDifference))}h`
      : `vence em ${Math.floor(hoursDifference)}h`;

  return {
    text: `${emoji} Ticket #${ticket.ticket_id.slice(0, 8).toUpperCase()} — SLA ${statusText}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *SLA ${statusText}*\nTicket #${ticket.ticket_id
            .slice(0, 8)
            .toUpperCase()} — ${ticket.ticket_title}`,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Cliente:*\n${ticket.account_name}`,
          },
          {
            type: "mrkdwn",
            text: `*Prioridade:*\n${ticket.priority.toUpperCase()}`,
          },
          {
            type: "mrkdwn",
            text: `*CSM:*\n${ticket.assigned_csm_name}`,
          },
          {
            type: "mrkdwn",
            text: `*Status SLA:*\n${timeText}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Ver Ticket",
              emoji: true,
            },
            value: ticket.ticket_id,
            action_id: "view_ticket",
            url: `${process.env.NEXT_PUBLIC_APP_URL}/suporte/${ticket.ticket_id}`,
          },
        ],
      },
    ],
  };
}

async function sendToSlack(message: SlackMessage): Promise<boolean> {
  const webhook = process.env.SLACK_WEBHOOK_SLA_ALERTS;

  if (!webhook) {
    console.warn("[SLA Escalation] SLACK_WEBHOOK_SLA_ALERTS not configured");
    return false;
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        `[SLA Escalation] Slack webhook failed with status ${response.status}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[SLA Escalation] Failed to send Slack message:", error);
    return false;
  }
}

async function checkDuplicateEscalation(
  ticketId: string,
  windowHours: number = 2
): Promise<boolean> {
  const { data, error } = await supabase
    .from("sla_escalations")
    .select("id")
    .eq("ticket_id", ticketId)
    .gte(
      "escalated_at",
      new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString()
    )
    .limit(1);

  if (error) {
    console.warn("[SLA Escalation] Error checking duplicate escalation:", error);
    return false;
  }

  return (data && data.length > 0) || false;
}

async function recordEscalation(
  ticket: CriticalTicket,
  slackSuccess: boolean
): Promise<void> {
  const { error } = await supabase.from("sla_escalations").insert({
    ticket_id: ticket.ticket_id,
    sla_status: ticket.sla_status,
    escalation_count: 1,
    slack_channel: "#sla-alerts",
  });

  if (error) {
    console.warn(
      `[SLA Escalation] Failed to record escalation for ticket ${ticket.ticket_id}:`,
      error
    );
    return;
  }

  // Log event
  const { error: eventError } = await supabase
    .from("ticket_events")
    .insert({
      ticket_id: ticket.ticket_id,
      event_type: "sla_escalation",
      responsible_csm_id: ticket.assigned_csm_id,
      payload: {
        sla_status: ticket.sla_status,
        slack_notified: slackSuccess,
        hours_elapsed: Math.floor(ticket.hours_elapsed),
      },
    });

  if (eventError) {
    console.warn(
      `[SLA Escalation] Failed to log event for ticket ${ticket.ticket_id}:`,
      eventError
    );
  }
}

export async function escalateSLAViolations() {
  try {
    console.log("[SLA Escalation] Starting SLA escalation job...");

    const criticalTickets = await getCriticalTickets();
    if (criticalTickets.length === 0) {
      console.log("[SLA Escalation] No critical tickets found");
      return { success: true, escalated: 0 };
    }

    let escalatedCount = 0;

    for (const ticket of criticalTickets) {
      // Check if already escalated in last 2 hours (de-duplication)
      const isDuplicate = await checkDuplicateEscalation(ticket.ticket_id, 2);
      if (isDuplicate) {
        console.log(
          `[SLA Escalation] Skipping duplicate escalation for ticket ${ticket.ticket_id}`
        );
        continue;
      }

      // Build and send message
      const message = buildSlackMessage(ticket);
      const slackSuccess = await sendToSlack(message);

      // Record escalation regardless of Slack success (circuit breaker)
      await recordEscalation(ticket, slackSuccess);

      escalatedCount++;
      console.log(
        `[SLA Escalation] ✓ Escalated ticket ${ticket.ticket_id} (Slack: ${slackSuccess ? "OK" : "FAILED"})`
      );
    }

    console.log(
      `[SLA Escalation] ✓ Job completed. Escalated ${escalatedCount} tickets`
    );
    return { success: true, escalated: escalatedCount };
  } catch (error) {
    console.error("[SLA Escalation] Cron job failed:", error);
    return { success: false, error: String(error) };
  }
}

// Entry point for deployment
if (require.main === module) {
  escalateSLAViolations().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}
