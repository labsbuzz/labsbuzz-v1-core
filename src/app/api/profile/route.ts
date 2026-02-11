import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// GET: Fetch user's profile (auto-creates if missing)
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

    let { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, phone, full_name, age, gender, role")
      .eq("id", user.id)
      .single();

    // If profile doesn't exist, create it automatically
    if (error || !profile) {
      const { error: insertError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email!,
        role: "user",
      });

      if (insertError) {
        console.error("Auto-create profile error:", insertError);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }

      // Re-fetch the newly created profile
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("id, email, phone, full_name, age, gender, role")
        .eq("id", user.id)
        .single();

      profile = newProfile;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Fetch profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update user's profile (upsert — creates if missing)
const updateSchema = z.object({
  fullName: z.string().min(2, "Full name is required").max(100),
  age: z.number().int().min(1, "Age must be at least 1").max(150, "Invalid age"),
  gender: z.enum(["male", "female", "other"], {
    error: "Gender must be male, female, or other",
  }),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
});

export async function PUT(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fullName, age, gender, phone } = parsed.data;
    const supabase = createAdminClient();

    // Use upsert so it works even if profile row doesn't exist yet
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email!,
      full_name: fullName,
      age,
      gender,
      phone,
    });

    if (error) {
      console.error("Update profile error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
