import { NextRequest, NextResponse } from "next/server";

interface SlackMessage {
  text: string;
  blocks: any[];
}

/**
 * POST /api/admin/test-sla-escalation
 * Forces a test Slack message to be sent to validate webhook configuration
 * Admin only endpoint for testing SLA escalation integration
 *
 * Request body: { channel?: string } (optional: override default #sla-alerts)
 *
 * Response:
 * {
 *   success: boolean,
 *   webhook_configured: boolean,
 *   message: string,
 *   slack_response?: any
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { channel = "#sla-alerts" } = await request.json().catch(() => ({}));

    const webhook = process.env.SLACK_WEBHOOK_SLA_ALERTS;

    if (!webhook) {
      return NextResponse.json(
        {
          success: false,
          webhook_configured: false,
          message:
            "SLACK_WEBHOOK_SLA_ALERTS não configurado. Configure a variável de ambiente.",
        },
        { status: 400 }
      );
    }

    // Build test message
    const testMessage: SlackMessage = {
      text: "🚨 Test SLA Escalation Message",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🚨 *TESTE - SLA VENCIDO*\nTicket #TEST001 — Validação de Integração Slack",
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
              text: "*Cliente:*\nCliente Teste",
            },
            {
              type: "mrkdwn",
              text: "*Prioridade:*\nCRÍTICA",
            },
            {
              type: "mrkdwn",
              text: "*CSM:*\nTeste Automático",
            },
            {
              type: "mrkdwn",
              text: "*Status SLA:*\nvencido há 3h (TESTE)",
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Esta é uma mensagem de teste enviada em " +
              new Date().toLocaleString("pt-BR") +
              "_",
          },
        },
      ],
    };

    // Send to Slack
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testMessage),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        `[Test SLA Escalation] Slack returned status ${response.status}: ${responseText}`
      );
      return NextResponse.json(
        {
          success: false,
          webhook_configured: true,
          message: `Slack webhook retornou status ${response.status}`,
          slack_response: responseText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook_configured: true,
      message:
        "✓ Mensagem de teste enviada com sucesso para o Slack! Verifique o canal #sla-alerts.",
      slack_response: responseText,
    });
  } catch (error) {
    console.error("[Test SLA Escalation] Error:", error);
    return NextResponse.json(
      {
        success: false,
        webhook_configured: false,
        message: "Erro ao enviar mensagem de teste",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
