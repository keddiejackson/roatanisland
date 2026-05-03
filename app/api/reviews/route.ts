import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

type ReviewRequest = {
  listingId?: string;
  reviewerName?: string;
  reviewerEmail?: string;
  rating?: number | string;
  comment?: string;
  photoUrls?: unknown;
};

function cleanPhotoUrls(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export async function POST(request: Request) {
  const body = (await request.json()) as ReviewRequest;
  const rating = Number(body.rating);
  const reviewerName = body.reviewerName?.trim().slice(0, 120);
  const reviewerEmail = body.reviewerEmail?.trim().slice(0, 160) || null;
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

  const { data: review, error } = await supabaseServer
    .from("listing_reviews")
    .insert([
      {
        listing_id: body.listingId,
        reviewer_name: reviewerName,
        reviewer_email: reviewerEmail,
        rating,
        comment,
        photo_urls: cleanPhotoUrls(body.photoUrls),
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
