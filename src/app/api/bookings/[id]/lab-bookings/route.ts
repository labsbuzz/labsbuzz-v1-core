import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Fetch all bookings for a lab (lab owner only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labRegistrationId } = await params;
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify lab ownership
    const { data: lab } = await supabase
      .from("lab_registrations")
      .select("id, user_id")
      .eq("id", labRegistrationId)
      .single();

    if (!lab || lab.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch bookings for this lab
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `id, status, total_price, created_at, user_id,
        lab_services!inner(
          available_tests(name, category)
        ),
        booking_patients(id, patient_name, patient_age, patient_gender, relationship),
        booking_status_logs(id, from_status, to_status, note, created_at),
        booking_reports(id, file_url, file_name, created_at)`
      )
      .eq("lab_registration_id", labRegistrationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch lab bookings error:", error);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    // Get user info for each booking
    const userIds = [...new Set((bookings || []).map((b) => b.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    const results = (bookings || []).map((b) => {
      const service = b.lab_services as unknown as {
        available_tests: { name: string; category: string };
      };
      const profile = profileMap.get(b.user_id);

      return {
        id: b.id,
        status: b.status,
        total_price: b.total_price,
        created_at: b.created_at,
        test_name: service.available_tests.name,
        category: service.available_tests.category,
        user_name: profile?.full_name || "Unknown",
        user_phone: profile?.phone || "",
        patient_count: b.booking_patients?.length || 0,
        patients: b.booking_patients || [],
        status_logs: b.booking_status_logs || [],
        reports: b.booking_reports || [],
      };
    });

    return NextResponse.json({ bookings: results });
  } catch (error) {
    console.error("Fetch lab bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
