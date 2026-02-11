import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch single booking detail
export async function GET(
  _request: NextRequest,
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

    const supabase = createAdminClient();

    // Fetch booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `id, status, total_price, created_at, user_id, lab_registration_id,
        lab_services!inner(
          price_inr,
          prerequisite,
          report_time_hours,
          available_tests(name, category)
        ),
        lab_registrations!inner(lab_name, city, state, unique_lab_id, user_id)`
      )
      .eq("id", id)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check access: booking owner or lab owner
    const lab = booking.lab_registrations as unknown as {
      lab_name: string;
      city: string;
      state: string;
      unique_lab_id: string;
      user_id: string;
    };

    if (booking.user_id !== user.id && lab.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch patients
    const { data: patients } = await supabase
      .from("booking_patients")
      .select("id, patient_name, patient_age, patient_gender, relationship")
      .eq("booking_id", id);

    // Fetch status logs
    const { data: statusLogs } = await supabase
      .from("booking_status_logs")
      .select("id, from_status, to_status, note, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: true });

    // Fetch reports
    const { data: reports } = await supabase
      .from("booking_reports")
      .select("id, file_url, file_name, created_at")
      .eq("booking_id", id);

    // Fetch review
    const { data: review } = await supabase
      .from("reviews")
      .select("id, rating, message, created_at")
      .eq("booking_id", id)
      .maybeSingle();

    const service = booking.lab_services as unknown as {
      price_inr: number;
      prerequisite: string;
      report_time_hours: number;
      available_tests: { name: string; category: string };
    };

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        total_price: booking.total_price,
        created_at: booking.created_at,
        user_id: booking.user_id,
        lab_registration_id: booking.lab_registration_id,
        test_name: service.available_tests.name,
        category: service.available_tests.category,
        price_per_test: service.price_inr,
        prerequisite: service.prerequisite,
        report_time_hours: service.report_time_hours,
        lab_name: lab.lab_name,
        city: lab.city,
        state: lab.state,
        unique_lab_id: lab.unique_lab_id,
        patients: patients || [],
        status_logs: statusLogs || [],
        reports: reports || [],
        review: review || null,
      },
    });
  } catch (error) {
    console.error("Fetch booking detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
