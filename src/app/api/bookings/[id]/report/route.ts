import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST: Upload report PDF
export async function POST(
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

    const supabase = createAdminClient();

    // Fetch booking
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

    // Validate status allows report upload
    const allowedStatuses = ["sample_collected", "report_generated", "done"];
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: "Report can only be uploaded after sample collection" },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("booking-reports")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("booking-reports")
      .getPublicUrl(fileName);

    // Insert report record
    const { error: reportError } = await supabase
      .from("booking_reports")
      .insert({
        booking_id: id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        uploaded_by: user.id,
      });

    if (reportError) {
      console.error("Report insert error:", reportError);
      return NextResponse.json(
        { error: "Failed to save report record" },
        { status: 500 }
      );
    }

    // Auto-update status to report_generated if currently sample_collected
    if (booking.status === "sample_collected") {
      await supabase
        .from("bookings")
        .update({ status: "report_generated" })
        .eq("id", id);

      await supabase.from("booking_status_logs").insert({
        booking_id: id,
        from_status: "sample_collected",
        to_status: "report_generated",
        changed_by: user.id,
        note: "Report uploaded",
      });
    }

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Report upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
