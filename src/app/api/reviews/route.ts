import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  rating: z.number().int().min(1).max(5),
  message: z.string().max(1000).optional().default(""),
});

// POST: Submit a review
export async function POST(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { bookingId, rating, message } = parsed.data;
    const supabase = createAdminClient();

    // Verify booking belongs to user and is done
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, user_id, status, lab_registration_id")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (booking.status !== "done") {
      return NextResponse.json(
        { error: "Can only review completed bookings" },
        { status: 400 }
      );
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this booking" },
        { status: 409 }
      );
    }

    // Insert review
    const { error: insertError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      user_id: user.id,
      lab_registration_id: booking.lab_registration_id,
      rating,
      message,
    });

    if (insertError) {
      console.error("Review insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit review" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch reviews for a lab
export async function GET(request: NextRequest) {
  try {
    const labId = request.nextUrl.searchParams.get("labId");

    if (!labId) {
      return NextResponse.json(
        { error: "labId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select(
        `id, rating, message, created_at,
        profiles!inner(full_name)`
      )
      .eq("lab_registration_id", labId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Fetch reviews error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    // Calculate average
    const ratings = (reviews || []).map((r) => r.rating);
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;

    const results = (reviews || []).map((r) => {
      const profile = r.profiles as unknown as { full_name: string };
      return {
        id: r.id,
        rating: r.rating,
        message: r.message,
        created_at: r.created_at,
        reviewer_name: profile?.full_name || "Anonymous",
      };
    });

    return NextResponse.json({
      reviews: results,
      avgRating,
      totalReviews: ratings.length,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
