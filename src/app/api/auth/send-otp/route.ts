import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

// Rate limit: store in-memory (per server instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW = 60_000 * 5; // 5 minute window

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

function generateOTP(): string {
  // Cryptographically random 6-digit OTP
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

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

    const { email } = parsed.data;

    // Rate limit by email
    if (!checkRateLimit(email.toLowerCase())) {
      return NextResponse.json(
        { error: "Too many requests. Please wait 5 minutes." },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this email
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Store new OTP
    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: email.toLowerCase(),
      code: otp,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to generate OTP" },
        { status: 500 }
      );
    }

    // Update existing user's metadata with fresh OTP before sending email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email.toLowerCase()
    );

    if (existingUser) {
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: { otp_code: otp },
      });
    }

    // Use anon client for signInWithOtp — triggers Supabase email pipeline
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: otpEmailError } = await anonClient.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: true,
        data: {
          otp_code: otp,
        },
      },
    });

    if (otpEmailError) {
      console.error("OTP email send error:", otpEmailError);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
