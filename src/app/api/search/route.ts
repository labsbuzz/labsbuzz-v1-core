import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET: Public search for labs and services (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const pincode = searchParams.get("pincode")?.trim() || "";
    const test = searchParams.get("test")?.trim() || "";
    const labId = searchParams.get("labId")?.trim() || "";

    const mode = searchParams.get("mode")?.trim() || "";

    const supabase = createAdminClient();

    // Case 0: Fetch all available test names for autocomplete
    if (mode === "suggestions") {
      const { data: tests, error } = await supabase
        .from("available_tests")
        .select("id, name, category")
        .order("name");

      if (error) {
        return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
      }

      return NextResponse.json({ tests: tests || [] });
    }

    if (!pincode && !test && !labId) {
      return NextResponse.json(
        { error: "Please provide a pincode or test name" },
        { status: 400 }
      );
    }

    // Case 1: Expand a specific lab's services
    if (labId) {
      const { data: services, error } = await supabase
        .from("lab_services")
        .select(
          "id, price_inr, prerequisite, report_time_hours, available_tests(name, category)"
        )
        .eq("lab_registration_id", labId)
        .order("price_inr", { ascending: true });

      if (error) {
        console.error("Lab services fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch services" },
          { status: 500 }
        );
      }

      return NextResponse.json({ mode: "lab_detail", services: services || [] });
    }

    // Case 2: Pincode only — show labs
    if (pincode && !test) {
      const { data: labs, error } = await supabase
        .from("lab_registrations")
        .select(
          "id, lab_name, city, state, pincode, unique_lab_id, lab_services(id)"
        )
        .eq("status", "approved")
        .eq("pincode", pincode);

      if (error) {
        console.error("Lab search error:", error);
        return NextResponse.json(
          { error: "Failed to search labs" },
          { status: 500 }
        );
      }

      // Transform to include service_count
      const labResults = (labs || [])
        .map((lab) => ({
          id: lab.id,
          lab_name: lab.lab_name,
          city: lab.city,
          state: lab.state,
          pincode: lab.pincode,
          unique_lab_id: lab.unique_lab_id,
          service_count: lab.lab_services?.length || 0,
        }))
        .filter((lab) => lab.service_count > 0);

      return NextResponse.json({ mode: "labs", labs: labResults });
    }

    // Case 3: Test name (with or without pincode) — show services sorted by price
    const query = supabase
      .from("lab_services")
      .select(
        "id, price_inr, prerequisite, report_time_hours, lab_registration_id, available_tests!inner(name, category), lab_registrations!inner(lab_name, city, state, pincode, unique_lab_id, status)"
      )
      .ilike("available_tests.name", `%${test}%`)
      .eq("lab_registrations.status", "approved")
      .order("price_inr", { ascending: true });

    if (pincode) {
      query.eq("lab_registrations.pincode", pincode);
    }

    const { data: services, error } = await query;

    if (error) {
      console.error("Service search error:", error);
      return NextResponse.json(
        { error: "Failed to search services" },
        { status: 500 }
      );
    }

    // Flatten the joined data
    const serviceResults = (services || []).map((s) => {
      const testInfo = s.available_tests as unknown as {
        name: string;
        category: string;
      };
      const labInfo = s.lab_registrations as unknown as {
        lab_name: string;
        city: string;
        state: string;
        pincode: string;
        unique_lab_id: string;
      };
      return {
        id: s.id,
        test_name: testInfo.name,
        category: testInfo.category,
        lab_name: labInfo.lab_name,
        city: labInfo.city,
        state: labInfo.state,
        pincode: labInfo.pincode,
        unique_lab_id: labInfo.unique_lab_id,
        price_inr: s.price_inr,
        prerequisite: s.prerequisite,
        report_time_hours: s.report_time_hours,
        lab_registration_id: s.lab_registration_id,
      };
    });

    return NextResponse.json({ mode: "services", services: serviceResults });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
