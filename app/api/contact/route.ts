import { NextResponse } from "next/server";
import { escapeHtml, sendAdminNotification } from "@/lib/notifications";

type ContactRequest = {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ContactRequest;

  if (!body.name || !body.email || !body.message) {
    return NextResponse.json(
      { error: "Please add your name, email, and message." },
      { status: 400 },
    );
  }

  await sendAdminNotification({
    subject: `New planning lead: ${body.name}`,
    replyTo: body.email,
    html: `
      <h2>New planning lead</h2>
      <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(body.phone)}</p>
      <p><strong>Interest:</strong> ${escapeHtml(body.interest)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(body.message)}</p>
    `,
    text: [
      "New planning lead",
      `Name: ${body.name}`,
      `Email: ${body.email}`,
      `Phone: ${body.phone || ""}`,
      `Interest: ${body.interest || ""}`,
      `Message: ${body.message}`,
    ].join("\n"),
  });

  return NextResponse.json({ ok: true });
}
