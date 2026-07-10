import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { logAppError } from "@/lib/error-log";
import {
  enforceRateLimit,
  getRequestUser,
  readJsonObject,
  unauthorized,
} from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

type ReviewRequest = {
  listingId?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  rating?: number | string;
  comment?: string;
  photoUrls?: unknown;
};

function cleanPhotoUrls(values: unknown, listingId: string) {
  if (!Array.isArray(values)) {
    return [];
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/listing-images/review-photos/${listingId}/`;

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => Boolean(value) && value.startsWith(expectedPrefix))
    .slice(0, 6);
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "review:create", {
    limit: 4,
    windowSeconds: 24 * 60 * 60,
  });
  if (limited) return limited;

  const user = await getRequestUser(request);
  if (!user) return unauthorized("Sign in before reviewing an experience.");

  const parsedBody = await readJsonObject<ReviewRequest>(request, 24 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const rating = Number(body.rating);
  const reviewerName = body.reviewerName?.trim().slice(0, 120);
  const reviewerEmail = user.email;
  const comment = body.comment?.trim().slice(0, 1500);

  if (
    !body.listingId ||
    !reviewerName ||
    !comment ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      { error: "Please add your name, rating, and review." },
      { status: 400 },
    );
  }

  const { data: listing } = await supabaseServer
    .from("listings")
    .select("id, title, is_active")
    .eq("id", body.listingId)
    .maybeSingle();

  if (!listing || listing.is_active === false) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const { data: completedBooking } = await supabaseServer
    .from("bookings")
    .select("id")
    .eq("listing_id", body.listingId)
    .eq("email", user.email)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!completedBooking) {
    return NextResponse.json(
      { error: "Reviews open after a completed booking for this experience." },
      { status: 403 },
    );
  }

  const { data: review, error } = await supabaseServer
    .from("listing_reviews")
    .insert([
      {
        listing_id: body.listingId,
        reviewer_name: reviewerName,
        reviewer_email: reviewerEmail,
        rating,
        comment,
        photo_urls: cleanPhotoUrls(body.photoUrls, body.listingId),
        is_approved: false,
      },
    ])
    .select("id")
    .single();

  if (error) {
    await logAppError({
      source: "review_submission",
      message: error.message,
      details: {
        listingId: body.listingId,
        reviewerEmail,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: reviewerEmail,
    actorRole: "guest",
    action: "review_submitted",
    targetType: "listing",
    targetId: body.listingId,
    targetLabel: listing.title,
    metadata: {
      review_id: review.id,
      rating,
      status: "waiting_for_admin_review",
    },
  });

  return NextResponse.json({ reviewId: review.id });
}
