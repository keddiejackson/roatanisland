import { logAppError } from "@/lib/error-log";

type AdminNotification = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type EmailNotification = AdminNotification & {
  to: string | string[];
};

function emailShell(title: string, body: string) {
  return `
    <div style="margin:0;background:#f7f3ea;padding:32px;font-family:Arial,sans-serif;color:#17324d">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden">
        <div style="background:#0b3c5d;color:#ffffff;padding:24px">
          <div style="font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9ee8e3">RoatanIsland.life</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:28px;font-size:16px;line-height:1.65;color:#334155">
          ${body}
        </div>
      </div>
    </div>
  `;
}

export function brandedEmail(title: string, rows: [string, string | number | null | undefined][], intro?: string) {
  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#64748b">${escapeHtml(label)}</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#0b3c5d">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join("");

  return emailShell(
    title,
    `
      ${intro ? `<p style="margin-top:0">${escapeHtml(intro)}</p>` : ""}
      <table style="width:100%;border-collapse:collapse">${rowHtml}</table>
    `,
  );
}

function getAdminRecipients() {
  const raw =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    "";

  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendAdminNotification(message: AdminNotification) {
  const recipients = getAdminRecipients();

  if (recipients.length === 0) {
    console.info("Admin email skipped: missing recipient.");
    return { sent: false, skipped: true };
  }

  return sendEmailNotification({
    ...message,
    to: recipients,
  });
}

export async function sendEmailNotification(message: EmailNotification) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = Array.isArray(message.to) ? message.to : [message.to];

  if (!apiKey || recipients.length === 0) {
    console.info("Email skipped: missing RESEND_API_KEY or recipient.");
    await logAppError({
      source: "email",
      message: "Email skipped because configuration or recipients are missing.",
      details: {
        hasApiKey: Boolean(apiKey),
        recipients,
        subject: message.subject,
      },
      severity: "warning",
    });
    return { sent: false, skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "RoatanIsland.life <onboarding@resend.dev>",
      to: recipients,
      subject: message.subject,
      html: message.html.includes("RoatanIsland.life")
        ? message.html
        : emailShell(message.subject, message.html),
      text: message.text,
      reply_to: message.replyTo,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Admin email failed:", details);
    await logAppError({
      source: "email",
      message: "Email provider rejected a message.",
      details: {
        details,
        recipients,
        subject: message.subject,
      },
    });
    return { sent: false, skipped: false };
  }

  return { sent: true, skipped: false };
}
