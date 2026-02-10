import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// One-time database setup endpoint
// Run this once to set up tables, RLS, and seed admin
export async function POST() {
  try {
    const supabase = createAdminClient();

    // Read and execute the SQL setup
    const sqlPath = join(process.cwd(), "src/lib/db-setup.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    // Execute SQL statements via Supabase's RPC or direct query
    const { error: sqlError } = await supabase.rpc("exec_sql", { sql_text: sql }).single();

    // If rpc doesn't exist, we'll set up tables individually
    if (sqlError) {
      console.log("RPC not available, tables may need manual SQL setup via Supabase dashboard");
    }

    // Seed admin user
    const adminEmail = "amanksah123@gmail.com";
    const adminPassword = "12345678";

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some((u) => u.email === adminEmail);

    if (!adminExists) {
      // Create admin user via Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      // Create admin profile
      if (newUser.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: newUser.user.id,
          email: adminEmail,
          role: "admin",
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }
    } else {
      // Admin exists — update password and ensure profile role is admin
      const existingAdmin = existingUsers?.users?.find((u) => u.email === adminEmail);
      if (existingAdmin) {
        await supabase.auth.admin.updateUserById(existingAdmin.id, {
          password: adminPassword,
        });
        await supabase.from("profiles").upsert({
          id: existingAdmin.id,
          email: adminEmail,
          role: "admin",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Setup complete. Admin user created.",
      note: "Run the SQL from src/lib/db-setup.sql in the Supabase SQL Editor to create tables and RLS policies.",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: "Setup failed. Check server logs." },
      { status: 500 }
    );
  }
}
