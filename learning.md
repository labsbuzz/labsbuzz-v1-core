# LabsBuzz — Learning Journal

Every new concept used in this project, explained simply and technically.

---

## 1. SMTP (Simple Mail Transfer Protocol)

**ELI5:**
Imagine you write a letter and give it to the postman. The postman takes it to the post office, then the post office sends it to another post office near your friend's house, and finally a postman delivers it to your friend. SMTP is like the postman system for emails. It's the set of rules that decides HOW an email travels from your app to someone's inbox. Without SMTP, your email just sits there with nowhere to go.

**Technical:**
SMTP is the standard protocol for sending emails across the internet. It works on a client-server model:

1. Your app (client) connects to an SMTP server (e.g., Gmail's `smtp.gmail.com` on port 587)
2. Your app authenticates with credentials (username + password or API key)
3. Your app sends the email data (from, to, subject, body) to the SMTP server
4. The SMTP server looks up the recipient's domain's MX (Mail Exchange) DNS record
5. It forwards the email to the recipient's mail server
6. The recipient's mail server stores it in their inbox

**In our project:** We tried Gmail SMTP and Resend SMTP to send OTP emails via Supabase. Both had issues (Gmail auth failures, Resend free tier restrictions), so we use Supabase's built-in email service instead.

**Architecture:**
```
Your App → SMTP Server (Gmail/Resend/Supabase) → DNS MX Lookup → Recipient's Mail Server → Inbox
```

---

## 2. OTP (One-Time Password)

**ELI5:**
When you go to a secret clubhouse, they don't just ask your name — they give you a special number that only works once, like "4523". You tell them the number, and if it matches, you get in. Next time, you get a different number. That's OTP — a password that works only once and expires quickly.

**Technical:**
OTP is an authentication mechanism where a random code (usually 6 digits) is generated server-side and sent to the user via email or SMS. The flow:

1. User enters their email
2. Server generates a random 6-digit code using `crypto.randomInt(100000, 999999)`
3. Server stores the OTP in a database table (`otp_codes`) with: email, code, expiry time (10 min), attempts counter
4. Server sends the OTP to the user's email
5. User enters the OTP on the frontend
6. Server compares the entered OTP with the stored one using timing-safe comparison (prevents timing attacks)
7. If it matches and hasn't expired → user is authenticated
8. The OTP is marked as "used" so it can't be reused

**In our project:** We generate OTPs in `/api/auth/send-otp`, store them in Supabase's `otp_codes` table, and verify them in `/api/auth/verify-otp`. We limit to 5 attempts per OTP and 10-minute expiry.

**Architecture:**
```
User enters email
    → POST /api/auth/send-otp
        → Generate random 6-digit code
        → Store in otp_codes table (with expiry)
        → Send email with code
    → User enters code
    → POST /api/auth/verify-otp
        → Fetch latest OTP from DB
        → Check: expired? too many attempts? code matches?
        → If valid → create session → user is logged in
```

---

## 3. Supabase Auth (Authentication System)

**ELI5:**
Imagine a big building with a security guard at the front. When you come for the first time, the guard makes you an ID card (sign up). Next time, you just show your ID card (sign in) and the guard lets you in. Supabase Auth is that security guard — it handles who can enter your app, makes ID cards (accounts), and checks them every time.

**Technical:**
Supabase Auth is a complete authentication system built on top of GoTrue (an open-source auth server). It provides:

- **User management:** Create, update, delete users in `auth.users` table
- **Sign-in methods:** Email/password, magic links, OTP, OAuth (Google, GitHub, etc.)
- **JWT tokens:** When you sign in, Supabase gives you two tokens:
  - **Access token** (short-lived, ~1 hour) — sent with every request to prove identity
  - **Refresh token** (long-lived, ~1 week) — used to get new access tokens silently
- **Session management:** Tokens are stored in cookies (for server-side) or localStorage (for client-side)

**In our project:** We use three auth methods:
- `signInWithOtp()` — sends magic link email for regular users
- `signInWithPassword()` — email + password for admin
- `signInWithOAuth()` — Google sign-in

**Architecture:**
```
User clicks "Sign In"
    → Supabase Auth Server (GoTrue)
        → Validates credentials
        → Creates JWT (access + refresh tokens)
        → Stores tokens in cookies/localStorage
    → Every subsequent request includes the JWT
    → Supabase checks JWT to identify the user
    → JWT expires → refresh token silently gets a new one
```

---

## 4. Anon Key vs Service Role Key

**ELI5:**
Think of a hotel. Guests get a room key that only opens THEIR room — that's the **anon key**. The hotel manager has a master key that opens EVERY room — that's the **service role key**. You give the guest key to visitors (browser), but you NEVER give the master key to anyone outside the hotel (server only).

**Technical:**
Supabase provides two API keys:

- **Anon Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`):**
  - Safe to expose in the browser (it's in your JavaScript bundle)
  - Respects Row Level Security (RLS) policies — can only access what policies allow
  - Used for: client-side operations, user-facing queries
  - Prefix: `NEXT_PUBLIC_` means it's bundled into client-side code

- **Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`):**
  - MUST be kept secret — only used in server-side code (API routes, middleware)
  - **Bypasses ALL RLS policies** — full database access
  - Used for: admin operations, creating users, modifying any data
  - Never prefix with `NEXT_PUBLIC_` — would expose it to browsers

**In our project:** We have three Supabase clients:
1. `lib/supabase/client.ts` — Browser client with anon key (used in React components)
2. `lib/supabase/server.ts` — Server client with anon key + cookies (used in server components/API routes to identify the logged-in user)
3. `lib/supabase/admin.ts` — Admin client with service role key (used in API routes for admin operations like creating users)

**Architecture:**
```
Browser (React components)
    → Uses ANON KEY → RLS enforced → Can only see own data

API Routes (server-side)
    → Server client (ANON KEY + cookies) → Identifies logged-in user
    → Admin client (SERVICE ROLE KEY) → Bypasses RLS → Full access
```

---

## 5. API Route Handlers (GET/POST/PATCH/DELETE)

**ELI5:**
Imagine a restaurant. You can do different things there:
- **GET** = "Show me the menu" (just looking, not changing anything)
- **POST** = "I want to place a new order" (creating something new)
- **PATCH** = "Change my order from pizza to pasta" (updating something)
- **DELETE** = "Cancel my order" (removing something)

The waiter (API route) listens for what you want and does the right thing.

**Technical:**
In Next.js App Router, API routes are defined in `route.ts` files inside the `app/api/` directory. Each file can export functions named after HTTP methods:

```typescript
// src/app/api/register-lab/route.ts
export async function GET() { }    // Handles GET requests
export async function POST() { }   // Handles POST requests
export async function PATCH() { }  // Handles PATCH requests
export async function DELETE() { }  // Handles DELETE requests
```

- **GET** — Retrieve data. Should never modify data. Cacheable.
- **POST** — Create new data. Sends data in the request body.
- **PATCH** — Partially update existing data.
- **PUT** — Fully replace existing data.
- **DELETE** — Remove data.

The client calls these using `fetch()`:
```typescript
// GET — no body
const res = await fetch("/api/register-lab");

// POST — with body
const res = await fetch("/api/register-lab", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ labName: "My Lab" }),
});
```

**In our project:**
- `GET /api/register-lab` → Fetch lab registrations (admin sees all, user sees own)
- `POST /api/register-lab` → Submit new lab registration
- `PATCH /api/register-lab` → Admin approves/rejects a registration
- `POST /api/auth/send-otp` → Send OTP email
- `POST /api/auth/verify-otp` → Verify OTP code

---

## 6. Middleware

**ELI5:**
Imagine a security checkpoint at an airport. Before you get to your gate (the page you want to visit), you MUST go through security first. They check your boarding pass and decide: "You can go to Gate A" or "Sorry, go back to the ticket counter." Middleware is that security checkpoint — it runs BEFORE every page loads and decides what happens.

**Technical:**
In Next.js, middleware is a function that runs on the Edge (before the request reaches your page or API route). It's defined in `src/middleware.ts` at the root of the `src` folder.

Middleware can:
- **Redirect** unauthenticated users to the login page
- **Rewrite** URLs (e.g., `/dashboard` → `/dashboard/overview`)
- **Modify headers** or cookies
- **Block requests** based on conditions

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get("session");

  if (!isLoggedIn && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next(); // Allow the request to continue
}

export const config = {
  matcher: ["/dashboard/:path*"], // Only run on these routes
};
```

**In our project:** Middleware checks if the user has a valid Supabase session. If they try to visit a protected page without being logged in, it redirects them to `/signin`. It also refreshes expired tokens automatically.

**Architecture:**
```
User visits /register-lab
    → Middleware runs FIRST
        → Checks cookies for Supabase session
        → If no session → redirect to /signin
        → If session exists → refresh token if needed → allow request
    → Page loads (register-lab/page.tsx)
```

---

## 7. RLS (Row Level Security)

**ELI5:**
Imagine a school where every student has a locker. Even though all lockers are in the same hallway, you can ONLY open YOUR locker — not anyone else's. The school put a rule: "Students can only access their own locker." RLS is that rule, but for database rows. Even if someone tries to read or change data, the database itself says "Nope, that's not yours."

**Technical:**
Row Level Security is a PostgreSQL feature that adds access control at the database level. Instead of trusting your app code to filter data correctly, the database ITSELF enforces who can see/modify which rows.

```sql
-- Enable RLS on a table
ALTER TABLE lab_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own registrations
CREATE POLICY "Users see own registrations"
  ON lab_registrations
  FOR SELECT
  USING (user_id = auth.uid());  -- auth.uid() = currently logged-in user's ID

-- Policy: Only admins can update status
CREATE POLICY "Admins can update"
  ON lab_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Why it matters:** Without RLS, if someone intercepts your API, they could potentially read ALL data. With RLS, even if they bypass your app code, the database blocks unauthorized access.

**Important:** The service role key BYPASSES RLS. That's why it must stay on the server only.

**In our project:** Our tables have RLS enabled. The admin client (service role) bypasses RLS for admin operations, while the anon key respects RLS policies.

---

## 8. Zod Validation

**ELI5:**
Imagine you're ordering a birthday cake. The bakery has rules: "Name must be written on the cake, it must be less than 20 letters, and you must pick a flavor." If you say "I want a cake with no name and no flavor," they say "Sorry, you need to fill in everything correctly." Zod is like those bakery rules — it checks if the data you send is correct before processing it.

**Technical:**
Zod is a TypeScript-first schema validation library. It lets you define the SHAPE of data you expect, and validates incoming data against it.

```typescript
import { z } from "zod";

// Define the shape
const labSchema = z.object({
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  labName: z.string().min(2, "Lab name required").max(200),
});

// Validate incoming data
const result = labSchema.safeParse(requestBody);

if (!result.success) {
  // result.error.issues[0].message = "Invalid email"
  return error;
}

// result.data is now typed and validated
const { email, phone, labName } = result.data;
```

**Why use it?**
- **Security:** Prevents malicious data from reaching your database
- **Type safety:** After validation, TypeScript knows the exact types
- **User feedback:** Clear error messages like "Invalid email" instead of crashes
- **Server + client:** Use the same schema on both frontend forms and API routes

**In our project:** We validate all API inputs with Zod — lab registration data, OTP requests, admin approve/reject requests.

---

## 9. OAuth (Google Sign-In)

**ELI5:**
Instead of creating a new username and password for every website, imagine you could just say "Ask Google who I am." You click "Sign in with Google," Google says "Yes, this is Aman, and his email is aman@gmail.com," and the website lets you in. You never shared your Google password with the website — Google just vouched for you.

**Technical:**
OAuth 2.0 is an authorization protocol that lets users sign in using an existing account (Google, GitHub, Facebook, etc.) instead of creating new credentials. The flow:

1. User clicks "Continue with Google" on your app
2. Your app redirects to Google's login page
3. User logs in to Google (or is already logged in)
4. Google asks: "Do you want to share your email with LabsBuzz?"
5. User clicks "Allow"
6. Google redirects back to your app with an **authorization code**
7. Your app exchanges this code for an **access token** (via Supabase)
8. Supabase uses the token to get the user's email and profile info
9. Supabase creates/finds the user and gives you a session

**In our project:** We use `supabase.auth.signInWithOAuth({ provider: "google" })` which handles steps 1-9 automatically. The callback URL is `/auth/callback` which exchanges the code for a session.

**Architecture:**
```
User clicks "Continue with Google"
    → Redirect to accounts.google.com
    → User logs in + approves
    → Google redirects to /auth/callback?code=ABC123
    → Supabase exchanges code for Google access token
    → Gets user email from Google
    → Creates/finds user in auth.users
    → Creates session (JWT tokens)
    → User is logged in
```

---

## 10. Magic Links (Passwordless Login)

**ELI5:**
Instead of remembering a password, imagine the website sends you a special link in your email. When you click that link, you're automatically logged in — no password needed! It's like getting a golden ticket in your email that opens the door just once.

**Technical:**
Magic links are a passwordless authentication method. Instead of storing and verifying passwords, the server generates a unique, time-limited token embedded in a URL and sends it via email.

Flow:
1. User enters their email
2. Server generates a cryptographic token (e.g., `token_hash=abc123xyz`)
3. Server creates a URL: `https://yourapp.com/auth/callback?token_hash=abc123xyz&type=magiclink`
4. Server sends this URL via email
5. User clicks the link
6. Your app extracts the `token_hash` from the URL
7. App calls `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })`
8. Supabase verifies the token is valid and not expired
9. If valid → session is created → user is logged in

**In our project:** We use a hybrid approach — we generate our own OTP (6-digit code) for the user to type in, but behind the scenes we also use Supabase's `generateLink()` to create a magic link. After OTP verification, we exchange the magic link token for a session. This gives us the best of both worlds: user-friendly OTP input + secure session creation.

---

## 11. Sessions & Cookies

**ELI5:**
When you go to an amusement park, you buy a wristband at the entrance. For the rest of the day, you just show your wristband to get on any ride — you don't need to buy a new ticket each time. A **session** is like that wristband — it proves you already logged in. A **cookie** is where the wristband is stored (in your browser), so your browser can show it automatically with every request.

**Technical:**
Sessions and cookies work together to keep users logged in:

**Cookies:**
- Small pieces of data stored in the browser
- Automatically sent with EVERY request to the same domain
- Have attributes: `httpOnly` (can't be read by JavaScript), `secure` (HTTPS only), `sameSite` (prevents CSRF), `maxAge` (expiration)

**Sessions (in Supabase):**
- When you sign in, Supabase gives you two JWT tokens:
  - `sb-access-token` — short-lived (~1 hour), contains your user ID and role
  - `sb-refresh-token` — long-lived (~1 week), used to get new access tokens
- These tokens are stored in cookies
- On every request, middleware reads the cookies, validates the access token
- If the access token is expired, middleware uses the refresh token to get a new one
- If the refresh token is also expired → user must sign in again

**In our project:** The Supabase SSR package (`@supabase/ssr`) handles cookies automatically. Our server client reads cookies to identify the user. Our middleware refreshes expired tokens.

**Architecture:**
```
User signs in
    → Supabase returns access_token + refresh_token
    → Stored in browser cookies

User visits /register-lab
    → Browser automatically sends cookies
    → Middleware reads access_token from cookie
    → If expired → uses refresh_token to get new access_token
    → If refresh_token expired → redirect to /signin
    → If valid → pass user info to the page
```

---

*More concepts will be added as we build new features!*
