import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;
    const supabase = createAdminClient();

    // Find the latest unused OTP for this email
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return NextResponse.json(
        { error: "No OTP found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await supabase
        .from("otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    // Increment attempts
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Verify OTP (timing-safe comparison)
    const isValid = timingSafeEqual(otp, otpRecord.code);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid OTP. Please try again." },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otpRecord.id);

    // Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email.toLowerCase()
    );

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a new user with a random password (they use OTP)
      const randomPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          password: randomPassword,
          email_confirm: true,
        });

      if (createError || !newUser.user) {
        return NextResponse.json(
          { error: "Failed to create account" },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
      isNewUser = true;

      // Create profile
      await supabase.from("profiles").insert({
        id: userId,
        email: email.toLowerCase(),
        role: "user",
      });
    }

    // Generate a session for the user
    // We use generateLink to create a magic link, then exchange it
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: email.toLowerCase(),
      });

    if (linkError || !linkData) {
      return NextResponse.json(
        { error: "Failed to generate session" },
        { status: 500 }
      );
    }

    // Extract the token from the link
    const url = new URL(linkData.properties.action_link);
    const token_hash = url.searchParams.get("token") || url.hash;

    return NextResponse.json({
      success: true,
      isNewUser,
      userId,
      // Return the magic link data for the client to exchange for a session
      actionLink: linkData.properties.action_link,
      message: isNewUser
        ? "Account created successfully!"
        : "Signed in successfully!",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
