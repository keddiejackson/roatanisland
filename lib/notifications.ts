type AdminNotification = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type EmailNotification = AdminNotification & {
  to: string | string[];
};

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
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Admin email failed:", details);
    return { sent: false, skipped: false };
  }

  return { sent: true, skipped: false };
}
