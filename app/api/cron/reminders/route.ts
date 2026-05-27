import { NextResponse } from "next/server";
import { runDueBookingReminders } from "@/lib/booking-reminders-server";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDueBookingReminders({ limit: 25 });

  return NextResponse.json(result);
}
