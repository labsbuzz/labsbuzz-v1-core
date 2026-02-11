import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const STATUS_ORDER = [
  "confirmed",
  "visited",
  "sample_collected",
  "report_generated",
  "done",
];

const statusSchema = z.object({
  status: z.enum(
    ["visited", "sample_collected", "report_generated", "done"] as const,
    { error: "Invalid status" }
  ),
  note: z.string().max(500).optional().default(""),
});

// PATCH: Lab updates booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { status: newStatus, note } = parsed.data;
    const supabase = createAdminClient();

    // Fetch booking and verify lab ownership
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, status, lab_registration_id")
      .eq("id", id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify lab ownership
    const { data: lab } = await supabase
      .from("lab_registrations")
      .select("id, user_id")
      .eq("id", booking.lab_registration_id)
      .single();

    if (!lab || lab.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate status transition (must move forward)
    const currentIndex = STATUS_ORDER.indexOf(booking.status);
    const newIndex = STATUS_ORDER.indexOf(newStatus);

    if (newIndex <= currentIndex) {
      return NextResponse.json(
        { error: `Cannot change status from "${booking.status}" to "${newStatus}"` },
        { status: 400 }
      );
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      console.error("Status update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update status" },
        { status: 500 }
      );
    }

    // Insert status log
    await supabase.from("booking_status_logs").insert({
      booking_id: id,
      from_status: booking.status,
      to_status: newStatus,
      changed_by: user.id,
      note: note || `Status updated to ${newStatus.replace(/_/g, " ")}`,
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
