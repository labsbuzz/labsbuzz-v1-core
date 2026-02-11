import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const patientSchema = z.object({
  patientName: z.string().min(2, "Patient name is required").max(100),
  patientAge: z.number().int().min(1).max(150),
  patientGender: z.enum(["male", "female", "other"], {
    error: "Gender must be male, female, or other",
  }),
  relationship: z.enum(
    ["self", "father", "mother", "spouse", "child", "sibling", "other"],
    { error: "Invalid relationship" }
  ),
});

const bookingSchema = z.object({
  labServiceId: z.string().uuid("Invalid service ID"),
  labRegistrationId: z.string().uuid("Invalid lab ID"),
  patients: z
    .array(patientSchema)
    .min(1, "At least one patient is required")
    .max(5, "Maximum 5 patients per booking"),
});

// POST: Create a new booking
export async function POST(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Check profile is complete
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    if (!profile?.full_name || !profile?.phone) {
      return NextResponse.json(
        { error: "Please complete your profile before booking" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { labServiceId, labRegistrationId, patients } = parsed.data;

    // Fetch service price
    const { data: service } = await supabase
      .from("lab_services")
      .select("id, price_inr, lab_registration_id")
      .eq("id", labServiceId)
      .single();

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    if (service.lab_registration_id !== labRegistrationId) {
      return NextResponse.json(
        { error: "Service does not belong to this lab" },
        { status: 400 }
      );
    }

    // Verify lab is approved
    const { data: lab } = await supabase
      .from("lab_registrations")
      .select("id, status")
      .eq("id", labRegistrationId)
      .eq("status", "approved")
      .single();

    if (!lab) {
      return NextResponse.json(
        { error: "Lab is not available" },
        { status: 400 }
      );
    }

    const totalPrice = Number(service.price_inr) * patients.length;

    // Insert booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        lab_registration_id: labRegistrationId,
        lab_service_id: labServiceId,
        status: "confirmed",
        total_price: totalPrice,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("Booking insert error:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Insert patients
    const patientRows = patients.map((p) => ({
      booking_id: booking.id,
      patient_name: p.patientName,
      patient_age: p.patientAge,
      patient_gender: p.patientGender,
      relationship: p.relationship,
    }));

    const { error: patientsError } = await supabase
      .from("booking_patients")
      .insert(patientRows);

    if (patientsError) {
      console.error("Patients insert error:", patientsError);
    }

    // Insert initial status log
    await supabase.from("booking_status_logs").insert({
      booking_id: booking.id,
      from_status: null,
      to_status: "confirmed",
      changed_by: user.id,
      note: "Booking confirmed",
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      totalPrice,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: List user's bookings
export async function GET() {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        `id, status, total_price, created_at,
        lab_services!inner(
          price_inr,
          available_tests(name, category)
        ),
        lab_registrations!inner(lab_name, city, state, unique_lab_id),
        booking_patients(id, patient_name, patient_age, patient_gender, relationship)`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch bookings error:", error);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    const results = (bookings || []).map((b) => {
      const service = b.lab_services as unknown as {
        price_inr: number;
        available_tests: { name: string; category: string };
      };
      const lab = b.lab_registrations as unknown as {
        lab_name: string;
        city: string;
        state: string;
        unique_lab_id: string;
      };
      return {
        id: b.id,
        status: b.status,
        total_price: b.total_price,
        created_at: b.created_at,
        test_name: service.available_tests.name,
        category: service.available_tests.category,
        price_per_test: service.price_inr,
        lab_name: lab.lab_name,
        city: lab.city,
        state: lab.state,
        unique_lab_id: lab.unique_lab_id,
        patient_count: b.booking_patients?.length || 0,
        patients: (b.booking_patients || []).map((p: { id: string; patient_name: string; patient_age: number; patient_gender: string; relationship: string }) => ({
          id: p.id,
          patient_name: p.patient_name,
          patient_age: p.patient_age,
          patient_gender: p.patient_gender,
          relationship: p.relationship,
        })),
      };
    });

    return NextResponse.json({ bookings: results });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
