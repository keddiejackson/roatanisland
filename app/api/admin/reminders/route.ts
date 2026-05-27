import { NextResponse } from "next/server";
import {
  loadBookingReminderRuntime,
  sendBookingReminder,
} from "@/lib/booking-reminders-server";
import { supabaseServer } from "@/lib/supabase-server";

type ReminderSettingRequest = {
  reminderType?: string;
  enabled?: boolean;
  subjectTemplate?: string | null;
  bodyTemplate?: string | null;
};

type SendReminderRequest = {
  candidateId?: string;
  bookingId?: string;
  reminderType?: string;
};

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

export async function GET(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const runtime = await loadBookingReminderRuntime();

  return NextResponse.json(runtime);
}

export async function PATCH(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ReminderSettingRequest;

  if (!body.reminderType) {
    return NextResponse.json(
      { error: "Choose a reminder type." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from("booking_reminder_settings")
    .upsert(
      {
        reminder_type: body.reminderType,
        enabled: body.enabled !== false,
        subject_template: body.subjectTemplate || null,
        body_template: body.bodyTemplate || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "reminder_type" },
    )
    .select("reminder_type, enabled, subject_template, body_template")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ setting: data });
}

export async function POST(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SendReminderRequest;
  const runtime = await loadBookingReminderRuntime({ includeSent: true });
  const candidate = runtime.candidates.find(
    (item) =>
      item.id === body.candidateId ||
      (item.bookingId === body.bookingId &&
        item.reminderType === body.reminderType),
  );

  if (!candidate) {
    return NextResponse.json(
      { error: "Reminder candidate not found." },
      { status: 404 },
    );
  }

  const result = await sendBookingReminder(candidate, {
    status: "manual",
    actorEmail: adminEmail,
  });

  return NextResponse.json({ result });
}
