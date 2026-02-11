import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET: Fetch available tests + lab's existing services
export async function GET(request: NextRequest) {
  const serverClient = await createServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch available tests (master list)
  const { data: tests } = await supabase
    .from("available_tests")
    .select("id, name, category")
    .order("category")
    .order("name");

  // Check which lab_registration_id query param
  const labRegId = request.nextUrl.searchParams.get("labRegId");

  if (labRegId) {
    // Verify the user owns this lab
    const { data: lab } = await supabase
      .from("lab_registrations")
      .select("id, user_id, lab_name, status")
      .eq("id", labRegId)
      .single();

    if (!lab || lab.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch existing services for this lab with test details
    const { data: services } = await supabase
      .from("lab_services")
      .select("id, test_id, price_inr, prerequisite, report_time_hours, available_tests(name, category)")
      .eq("lab_registration_id", labRegId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      tests: tests || [],
      services: services || [],
      lab,
    });
  }

  return NextResponse.json({ tests: tests || [] });
}

// POST: Add services to a lab
const serviceSchema = z.object({
  labRegId: z.string().uuid("Invalid lab registration ID"),
  services: z.array(
    z.object({
      testId: z.string().uuid("Invalid test ID"),
      priceInr: z.number().positive("Price must be greater than 0"),
      prerequisite: z.string().max(500, "Prerequisite too long").default(""),
      reportTimeHours: z.number().int().positive("Report time must be at least 1 hour"),
    })
  ).min(1, "At least one service is required"),
});

export async function POST(request: NextRequest) {
  const serverClient = await createServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const result = serviceSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { labRegId, services } = result.data;
  const supabase = createAdminClient();

  // Verify the user owns this approved lab
  const { data: lab } = await supabase
    .from("lab_registrations")
    .select("id, user_id, status")
    .eq("id", labRegId)
    .single();

  if (!lab || lab.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (lab.status !== "approved") {
    return NextResponse.json(
      { error: "Lab must be approved to add services" },
      { status: 403 }
    );
  }

  // Insert services (upsert to handle duplicates)
  const rows = services.map((s) => ({
    lab_registration_id: labRegId,
    test_id: s.testId,
    price_inr: s.priceInr,
    prerequisite: s.prerequisite,
    report_time_hours: s.reportTimeHours,
  }));

  const { error: insertError } = await supabase
    .from("lab_services")
    .upsert(rows, { onConflict: "lab_registration_id,test_id" });

  if (insertError) {
    console.error("Insert services error:", insertError);
    return NextResponse.json(
      { error: "Failed to save services" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: services.length });
}

// DELETE: Remove a service
const deleteSchema = z.object({
  serviceId: z.string().uuid("Invalid service ID"),
});

export async function DELETE(request: NextRequest) {
  const serverClient = await createServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const result = deleteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify ownership: service → lab_registration → user_id
  const { data: service } = await supabase
    .from("lab_services")
    .select("id, lab_registration_id")
    .eq("id", result.data.serviceId)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const { data: labReg } = await supabase
    .from("lab_registrations")
    .select("user_id")
    .eq("id", service.lab_registration_id)
    .single();

  if (!labReg || labReg.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("lab_services")
    .delete()
    .eq("id", result.data.serviceId);

  if (deleteError) {
    console.error("Delete service error:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
