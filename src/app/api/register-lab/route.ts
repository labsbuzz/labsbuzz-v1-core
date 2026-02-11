import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const labSchema = z.object({
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  labName: z.string().min(2, "Lab name is required").max(200),
  landmark: z.string().min(2, "Landmark is required").max(200),
  city: z.string().min(2, "City is required").max(100),
  district: z.string().min(2, "District is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z
    .string()
    .regex(/^(\d{6})?$/, "Pincode must be 6 digits")
    .optional()
    .default(""),
  latitude: z.number().min(-90).max(90).optional().default(0),
  longitude: z.number().min(-180).max(180).optional().default(0),
  labRegIdNo: z.string().min(2, "Lab Registration ID is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  userId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = labSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const supabase = createAdminClient();

    // Check for duplicate lab reg ID
    const { data: existing } = await supabase
      .from("lab_registrations")
      .select("id")
      .eq("lab_reg_id_no", data.labRegIdNo)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A lab with this registration ID already exists." },
        { status: 409 }
      );
    }

    // Generate unique lab ID
    const { data: uniqueIdResult } = await supabase.rpc(
      "generate_unique_lab_id"
    );

    const uniqueLabId =
      uniqueIdResult ||
      `LB-${Date.now().toString(36).toUpperCase().slice(-8)}`;

    // If user doesn't have an account yet, create one
    let userId = data.userId;

    if (!userId) {
      // Check if email exists in auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === data.email.toLowerCase()
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create a new user
        const randomPassword = crypto.randomUUID() + "Aa1!";
        const { data: newUser, error: createError } =
          await supabase.auth.admin.createUser({
            email: data.email.toLowerCase(),
            password: randomPassword,
            email_confirm: true,
          });

        if (createError || !newUser.user) {
          return NextResponse.json(
            { error: "Failed to create user account" },
            { status: 500 }
          );
        }

        userId = newUser.user.id;

        // Create profile with 'labs' role
        await supabase.from("profiles").upsert({
          id: userId,
          email: data.email.toLowerCase(),
          phone: data.phone,
          role: "labs",
        });
      }
    }

    // Update profile phone if not set
    await supabase
      .from("profiles")
      .update({ phone: data.phone })
      .eq("id", userId);

    // Insert lab registration
    const { data: labData, error: labError } = await supabase
      .from("lab_registrations")
      .insert({
        user_id: userId,
        unique_lab_id: uniqueLabId,
        email: data.email.toLowerCase(),
        phone: data.phone,
        lab_name: data.labName,
        landmark: data.landmark,
        city: data.city,
        district: data.district,
        state: data.state,
        pincode: data.pincode || "",
        latitude: data.latitude,
        longitude: data.longitude,
        lab_reg_id_no: data.labRegIdNo,
        image_url: data.imageUrl || null,
        description: data.description || null,
        status: "pending",
      })
      .select("unique_lab_id")
      .single();

    if (labError) {
      console.error("Lab registration error:", labError);
      return NextResponse.json(
        { error: "Failed to register lab" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uniqueLabId: labData.unique_lab_id,
      message: "Lab registered successfully! Your unique ID is: " + labData.unique_lab_id,
    });
  } catch (error) {
    console.error("Register lab error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Fetch lab registrations (admin gets all, user gets own)
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

    // Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    if (isAdmin) {
      // Admin: return all registrations
      const { data: registrations, error } = await supabase
        .from("lab_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch registrations" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        role: "admin",
        registrations: registrations || [],
      });
    } else {
      // Regular user: return only their registrations
      const { data: registrations, error } = await supabase
        .from("lab_registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch registrations" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        role: profile?.role || "user",
        registrations: registrations || [],
      });
    }
  } catch (error) {
    console.error("Fetch registrations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Admin approve/reject lab registration
const patchSchema = z.object({
  registrationId: z.string().uuid("Invalid registration ID"),
  status: z.enum(["approved", "rejected"], {
    error: "Status must be 'approved' or 'rejected'",
  }),
});

export async function PATCH(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { registrationId, status } = parsed.data;

    // Update registration status
    const { data: registration, error: updateError } = await supabase
      .from("lab_registrations")
      .update({ status })
      .eq("id", registrationId)
      .select("user_id, unique_lab_id, lab_name")
      .single();

    if (updateError || !registration) {
      return NextResponse.json(
        { error: "Failed to update registration" },
        { status: 500 }
      );
    }

    // On approval, update user's role to "labs"
    if (status === "approved" && registration.user_id) {
      await supabase
        .from("profiles")
        .update({ role: "labs" })
        .eq("id", registration.user_id);
    }

    return NextResponse.json({
      success: true,
      message: `Lab "${registration.lab_name}" has been ${status}.`,
    });
  } catch (error) {
    console.error("Update registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
