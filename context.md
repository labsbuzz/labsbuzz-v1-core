# Web Application Development Context

This product is related to health sector 

## Project Overview
This document outlines the core principles and standards for building a production-ready web application with a focus on security, performance, and maintainability.

---

## Core Principles (In Priority Order)

### 1. 🔒 Security First
Security is our **TOP PRIORITY** and non-negotiable across all aspects of development.

**Requirements:**
- **Input Validation**: Sanitize and validate ALL user inputs on both client and server side
- **Authentication & Authorization**: Implement robust auth mechanisms (JWT, OAuth 2.0, or session-based)
- **SQL Injection Prevention**: Use parameterized queries or ORM with prepared statements
- **XSS Protection**: Escape all user-generated content, implement CSP headers
- **CSRF Protection**: Implement CSRF tokens for all state-changing operations
- **Secure Headers**: Set appropriate security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- **Data Encryption**: 
  - HTTPS/TLS for all data in transit
  - Encrypt sensitive data at rest (passwords with bcrypt/argon2, PII with AES-256)
- **Rate Limiting**: Implement rate limiting on all API endpoints
- **Dependency Security**: Regular security audits of dependencies (npm audit, Snyk)
- **Error Handling**: Never expose stack traces or sensitive info in production errors
- **Environment Variables**: Store secrets in environment variables, never commit to version control

### 2. 👤 User Convenience
Deliver an intuitive, accessible, and pleasant user experience.

**Requirements:**
- **Intuitive UI/UX**: Clear navigation, consistent design patterns
- **Accessibility**: WCAG 2.1 AA compliance minimum
- **Responsive Design**: Mobile-first approach, works on all devices
- **Clear Feedback**: Loading states, success/error messages, tooltips
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Auto-save Features**: Where applicable (forms, drafts)
- **Keyboard Navigation**: Full keyboard accessibility
- **Error Recovery**: Helpful error messages with actionable next steps

### 3. 🎯 Smooth Experience
Ensure seamless interactions without jank or disruption.

**Requirements:**
- **Optimistic UI Updates**: Update UI immediately, handle errors gracefully
- **Smooth Animations**: 60fps animations, use CSS transforms and opacity
- **No Layout Shifts**: Reserve space for dynamic content (images, ads)
- **Graceful Degradation**: Handle network failures elegantly
- **Background Sync**: Queue failed requests for retry
- **Debouncing/Throttling**: Implement for search, scroll, resize handlers
- **Progressive Loading**: Show content as it becomes available

### 4. ⚡ Performance & Speed
Optimize for fast load times and responsive interactions.

**Requirements:**
- **Target Metrics**:
  - First Contentful Paint (FCP): < 1.8s
  - Largest Contentful Paint (LCP): < 2.5s
  - Time to Interactive (TTI): < 3.5s
  - Cumulative Layout Shift (CLS): < 0.1
  - First Input Delay (FID): < 100ms

**Optimization Strategies**:
- **Code Splitting**: Lazy load routes and components
- **Bundle Optimization**: Tree shaking, minification, compression (Gzip/Brotli)
- **Image Optimization**: WebP format, lazy loading, responsive images
- **Caching Strategy**: 
  - Static assets with long cache headers
  - Service Worker for offline capability
  - Redis/Memcached for server-side caching
- **Database Optimization**: Proper indexing, query optimization, connection pooling
- **CDN**: Serve static assets from CDN
- **API Efficiency**: Pagination, field selection, batch requests

---

## Code Structure & Architecture

### Directory Structure
```
/project-root
├── /src
│   ├── /components       # Reusable UI components
│   │   ├── /common       # Shared components (Button, Input, Modal)
│   │   └── /features     # Feature-specific components
│   ├── /pages            # Route/page components
│   ├── /hooks            # Custom React hooks
│   ├── /services         # API calls and external services
│   │   └── supabase.ts   # Supabase client initialization
│   ├── /utils            # Helper functions and utilities
│   ├── /store            # State management (Redux/Zustand/Context)
│   ├── /types            # TypeScript type definitions
│   ├── /constants        # App-wide constants
│   ├── /styles           # Global styles and themes
│   └── /assets           # Images, fonts, static files
├── /supabase
│   ├── /migrations       # Database migrations (auto-generated)
│   ├── /functions        # Edge Functions
│   │   ├── /send-email
│   │   └── /process-payment
│   ├── /seed             # Seed data for development
│   └── config.toml       # Supabase configuration
├── /tests
│   ├── /unit             # Unit tests
│   ├── /integration      # Integration tests
│   └── /e2e              # End-to-end tests
├── /docs                 # Documentation
├── .env.example          # Environment variables template
├── .env.local            # Local environment variables (gitignored)
├── .gitignore
├── package.json
└── README.md
```

**Supabase Client Setup:**
```typescript
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type-safe database types (generate with Supabase CLI)
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
import { Database } from '@/types/supabase';

export const supabaseTyped = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Coding Standards

#### 1. **Naming Conventions**
```javascript
// Variables and functions: camelCase
const userProfile = {};
function getUserData() {}

// Classes and Components: PascalCase
class UserService {}
const UserProfile = () => {};

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// Files: kebab-case or PascalCase (for components)
// user-profile.js or UserProfile.jsx
```

#### 2. **Comments & Documentation**
```javascript
/**
 * Fetches user data from the API with retry logic
 * 
 * @param {string} userId - The unique identifier for the user
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<User>} User object with profile data
 * @throws {Error} When user is not found or max retries exceeded
 * 
 * @example
 * const user = await fetchUserData('user-123', { maxRetries: 5 });
 */
async function fetchUserData(userId, options = {}) {
  // Validate input
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid userId is required');
  }

  const { maxRetries = 3 } = options;
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      // Log error for monitoring
      logger.error(`Attempt ${attempt + 1} failed:`, error);
      
      // Rethrow on last attempt
      if (attempt === maxRetries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

**Comment Guidelines:**
- Use JSDoc for all functions, classes, and modules
- Explain **WHY** not **WHAT** (code should be self-explanatory)
- Document edge cases and assumptions
- Add TODO comments with issue tracker references
- Keep comments up-to-date with code changes

#### 3. **Code Quality**
```javascript
// ❌ BAD: Complex, hard to read
function p(u) {
  return u.f && u.l ? u.f + ' ' + u.l : u.e;
}

// ✅ GOOD: Clear, self-documenting
function getDisplayName(user) {
  const hasFullName = user.firstName && user.lastName;
  return hasFullName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email;
}

// ✅ GOOD: Single Responsibility Principle
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}
```

**Quality Principles:**
- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Functions**: Max 20-30 lines, single responsibility
- **Files**: Max 300-400 lines, split if exceeding
- **Cyclomatic Complexity**: Keep below 10

---

## Production-Ready Standards

### 1. **Error Handling**
```javascript
// Client-side error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service (Sentry, LogRocket)
    errorTrackingService.captureException(error, { extra: errorInfo });
  }
}

// Server-side error handler
app.use((err, req, res, next) => {
  // Log error with context
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
  });

  // Don't leak error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});
```

### 2. **Logging & Monitoring**
```javascript
// Use structured logging
logger.info('User login successful', {
  userId: user.id,
  timestamp: new Date().toISOString(),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

// Track performance metrics
const startTime = performance.now();
await performOperation();
const duration = performance.now() - startTime;

metrics.recordTiming('operation.duration', duration);
```

**Implement:**
- Application Performance Monitoring (APM): New Relic, DataDog
- Error Tracking: Sentry, Rollbar
- Logging: Winston, Pino (structured logs)
- Analytics: Google Analytics, Mixpanel

### 3. **Testing**
```javascript
// Unit Test Example (Jest)
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });
});
```

**Test Coverage Goals:**
- Unit Tests: 80%+ coverage
- Integration Tests: Critical paths
- E2E Tests: User flows
- Run tests in CI/CD pipeline

### 4. **Environment Configuration**
```bash
# .env.example

# App Environment
NODE_ENV=development

# Supabase Configuration (Client-side - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Configuration (Server-side - keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database (Direct connection - for migrations/admin tasks only)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000

# External Services
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REALTIME=true
```

**Important Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser (safe for anon key)
- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Store production secrets in Vercel/Netlify environment variables dashboard
- Use different Supabase projects for development/staging/production

---

## Scalability Considerations

### 1. **Database Design**
- Use proper indexing for frequently queried fields
- Implement database migrations (Prisma, Sequelize, TypeORM)
- Design for horizontal scaling (avoid server-side sessions in DB)
- Use read replicas for heavy read operations
- Implement caching layer (Redis) for frequently accessed data

### 2. **API Design**
```javascript
// RESTful API best practices
// ✅ GOOD
GET    /api/v1/users              # List users (with pagination)
GET    /api/v1/users/:id          # Get single user
POST   /api/v1/users              # Create user
PUT    /api/v1/users/:id          # Update user (full)
PATCH  /api/v1/users/:id          # Update user (partial)
DELETE /api/v1/users/:id          # Delete user

// Versioning in URL
// Pagination, filtering, sorting
GET /api/v1/users?page=1&limit=20&sort=-createdAt&status=active

// Response format consistency
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### 3. **Frontend Scalability**
- Component library for consistency
- State management that scales (Redux, Zustand)
- Code splitting by route
- Virtualization for long lists (react-window)
- Memoization for expensive computations

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml example
name: CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
      - name: Check code quality
        run: npm run lint
      - name: Security audit
        run: npm audit

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: npm run deploy
```

**Pipeline Stages:**
1. Linting (ESLint, Prettier)
2. Type checking (TypeScript)
3. Unit & Integration tests
4. Security scan
5. Build
6. Deploy to staging
7. E2E tests on staging
8. Deploy to production

---

## Additional Best Practices

### 1. **Git Workflow**
```bash
# Commit message format
type(scope): subject

# Types: feat, fix, docs, style, refactor, test, chore
# Example:
feat(auth): add password reset functionality
fix(api): resolve race condition in user creation
docs(readme): update installation instructions
```

**Branching Strategy:**
- `main` - production-ready code
- `develop` - integration branch
- `feature/*` - new features
- `bugfix/*` - bug fixes
- `hotfix/*` - urgent production fixes

### 2. **Code Review Checklist**
- [ ] Code follows style guide
- [ ] All tests pass
- [ ] No security vulnerabilities
- [ ] Performance implications considered
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Accessibility requirements met

### 3. **Performance Budget**
- JavaScript bundle: < 200KB (gzipped)
- CSS bundle: < 50KB (gzipped)
- Images: Optimized and lazy-loaded
- Fonts: Subset and preloaded

### 4. **Dependencies Management**
- Regular updates (weekly/monthly)
- Audit for security vulnerabilities
- Prefer well-maintained packages
- Minimize bundle size
- Lock versions in package-lock.json

---

## Technology Recommendations

### Frontend (Mobile-First)
- **Framework**: Next.js 14+ (App Router) - Mobile-optimized by default
- **Language**: TypeScript - Type safety and better IDE support
- **Styling**: Tailwind CSS - Mobile-first utility classes
- **UI Components**: shadcn/ui (Radix UI + Tailwind) - Accessible and customizable
- **Icons**: lucide-react - Lightweight and tree-shakeable
- **State Management**: 
  - Zustand (client state) - Simple and performant
  - React Query (server state) - Perfect for Supabase data
- **Forms**: React Hook Form + Zod - Best performance and validation
- **Testing**: Jest + React Testing Library + Playwright (for E2E)
- **Mobile Detection**: Custom hooks (useMobile, useMediaQuery)

### Backend
- **Backend-as-a-Service**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Runtime** (for Edge Functions): Deno
- **Validation**: Zod or Joi
- **Testing**: Jest + Supabase Test Helpers

### DevOps
- **Hosting**: Vercel, Netlify, or Cloudflare Pages
- **Database**: Supabase (PostgreSQL with built-in APIs)
- **CDN**: Cloudflare or Supabase CDN
- **Monitoring**: Sentry + Supabase Analytics
- **CI/CD**: GitHub Actions or GitLab CI

---

## 🚀 Quick Start: Mobile-First Setup

### 1. Create Next.js Project
```bash
# Create app with TypeScript and Tailwind
npx create-next-app@latest my-app \
  --typescript \
  --tailwind \
  --app \
  --use-npm

cd my-app
```

### 2. Install Core Dependencies
```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI Components
npx shadcn-ui@latest init
# Follow prompts: choose default style, base color

# State Management
npm install zustand @tanstack/react-query

# Forms
npm install react-hook-form zod @hookform/resolvers

# Icons
npm install lucide-react

# Utilities
npm install clsx tailwind-merge class-variance-authority
```

### 3. Install shadcn/ui Components
```bash
# Install essential components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add form
npx shadcn-ui@latest add card

# Add more as needed:
npx shadcn-ui@latest add <component-name>
```

### 4. Set Up Supabase
```bash
# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

# Generate TypeScript types from Supabase
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/types/supabase.ts
```

### 5. Create Supabase Client
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts (for Server Components)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

### 6. Set Up React Query
```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 7. Project Structure
```
my-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   └── auth/callback/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── auth/
│   └── shared/
├── hooks/
│   ├── useMobile.ts
│   └── useAuth.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils.ts
├── types/
│   └── supabase.ts
├── context.md           # This file!
├── .env.local
└── package.json
```

### 8. Ready to Code!
```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### 9. Tell Claude Code:
```
"Following context.md, create a mobile-first authentication flow 
with Supabase and Next.js App Router"
```

---

---

## Supabase Backend: Security & Best Practices

### Overview
Supabase provides PostgreSQL database, Authentication, Storage, Realtime subscriptions, and Edge Functions. **Security is critical** - improper configuration can expose your entire database.

---

### 🔒 1. Row Level Security (RLS) - CRITICAL

**⚠️ ALWAYS ENABLE RLS ON EVERY TABLE**

```sql
-- Enable RLS on table creation
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRITICAL: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users cannot delete (optional)
CREATE POLICY "Users cannot delete"
  ON users
  FOR DELETE
  USING (false);
```

**Common RLS Patterns:**

```sql
-- Public read, authenticated write
CREATE POLICY "Public read access"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Role-based access
CREATE POLICY "Admin full access"
  ON sensitive_data
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Multi-tenant isolation
CREATE POLICY "Users see only their organization data"
  ON projects
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

**⚠️ RLS Edge Cases & Gotchas:**

```sql
-- 1. BYPASS RLS: Service role key bypasses RLS!
-- NEVER use service_role key in client-side code
-- Only use in secure server environments

-- 2. NULL values: RLS policies must handle NULL
CREATE POLICY "Handle NULL owner_id"
  ON items
  FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR owner_id IS NULL AND is_public = true
  );

-- 3. Performance: Complex RLS policies can slow queries
-- Create indexes on columns used in RLS policies
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_organization_id ON posts(organization_id);

-- 4. Foreign key policies: Must allow reading referenced data
CREATE POLICY "Can read referenced users"
  ON users FOR SELECT
  USING (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.author_id = users.id 
      AND posts.viewer_id = auth.uid()
    )
  );
```

---

### 🔑 2. API Keys Management

**Three types of keys:**

```typescript
// 1. ANON KEY (Public) - Safe for client-side
// - Respects RLS policies
// - Limited to authenticated user's permissions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. SERVICE_ROLE KEY (Secret) - NEVER expose to client
// - Bypasses RLS
// - Full admin access
// - Only use in secure server environments (API routes, Edge Functions)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 3. Custom JWT - For external auth integration
```

**Security Rules:**
```javascript
// ✅ GOOD: Anon key in client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ✅ GOOD: Service role in API route
// pages/api/admin/delete-user.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify admin permission first!
  const userRole = await verifyUserRole(req);
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Now safe to use admin privileges
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

// ❌ BAD: Service role in client code
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

---

### 🔐 3. Authentication Best Practices

```typescript
// ✅ GOOD: Proper auth flow with error handling
async function signUpUser(email: string, password: string) {
  try {
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation required
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          // Additional user metadata
          display_name: email.split('@')[0],
        }
      }
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data.user && !data.session) {
      return {
        message: 'Please check your email to confirm your account',
        requiresEmailConfirmation: true
      };
    }

    return { user: data.user, session: data.session };
    
  } catch (error) {
    // Log error for monitoring
    console.error('Signup error:', error);
    
    // Return user-friendly message
    if (error.message.includes('already registered')) {
      throw new Error('This email is already registered');
    }
    
    throw error;
  }
}

// ✅ GOOD: Protected route with session check
async function getUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    // Redirect to login
    window.location.href = '/login';
    return null;
  }
  
  return session.user;
}

// ✅ GOOD: Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user.id);
  }
  
  if (event === 'SIGNED_OUT') {
    // Clear local state
    localStorage.clear();
    window.location.href = '/login';
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
  
  if (event === 'USER_UPDATED') {
    console.log('User profile updated');
  }
});
```

**Auth Edge Cases:**

```typescript
// 1. Email verification required but not configured
// Solution: Check confirmationRequiredError
const { error } = await supabase.auth.signUp({ email, password });
if (error?.message?.includes('Email not confirmed')) {
  // Show "Please confirm your email" message
}

// 2. Token expiration during long sessions
// Solution: Supabase auto-refreshes, but handle edge case
const { data, error } = await supabase
  .from('users')
  .select()
  .single();

if (error?.message?.includes('JWT')) {
  // Force refresh
  await supabase.auth.refreshSession();
  // Retry request
}

// 3. Multiple tabs/windows authentication
// Solution: Use auth state listener in all tabs
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      // Update state in all tabs
      setUser(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}, []);

// 4. Social auth redirect handling
// pages/auth/callback.tsx
useEffect(() => {
  const handleOAuthCallback = async () => {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth callback error:', error);
      router.push('/login?error=auth_failed');
      return;
    }
    
    if (data.session) {
      router.push('/dashboard');
    }
  };
  
  handleOAuthCallback();
}, []);
```

---

### 💾 4. Database Best Practices

**Schema Design:**

```sql
-- Use UUID for primary keys (better for distributed systems)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Soft deletes (don't actually delete data)
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

CREATE POLICY "Hide deleted users"
  ON users FOR SELECT
  USING (deleted_at IS NULL);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Foreign keys with proper cascading
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Query Best Practices:**

```typescript
// ✅ GOOD: Select only needed columns
const { data, error } = await supabase
  .from('users')
  .select('id, email, display_name')
  .eq('id', userId)
  .single();

// ❌ BAD: Select all columns
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// ✅ GOOD: Pagination
const { data, error, count } = await supabase
  .from('posts')
  .select('*', { count: 'exact' })
  .range(0, 9) // First 10 items
  .order('created_at', { ascending: false });

// ✅ GOOD: Joins (using foreign keys)
const { data, error } = await supabase
  .from('posts')
  .select(`
    id,
    title,
    content,
    author:users (
      id,
      email,
      display_name
    )
  `)
  .eq('published', true);

// ✅ GOOD: Count without fetching data
const { count, error } = await supabase
  .from('posts')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);

// ✅ GOOD: Upsert (insert or update)
const { data, error } = await supabase
  .from('user_preferences')
  .upsert({ 
    user_id: userId, 
    theme: 'dark' 
  }, { 
    onConflict: 'user_id' 
  });

// ✅ GOOD: Bulk insert
const { data, error } = await supabase
  .from('posts')
  .insert([
    { title: 'Post 1', user_id: userId },
    { title: 'Post 2', user_id: userId },
  ]);
```

**Edge Cases:**

```typescript
// 1. Handling null values
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .or('description.is.null,description.eq.""'); // null OR empty string

// 2. Case-insensitive search
const { data, error } = await supabase
  .from('users')
  .select('*')
  .ilike('email', '%@gmail.com%'); // Case-insensitive LIKE

// 3. Full-text search (requires tsvector column)
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .textSearch('content', 'typescript', { 
    type: 'websearch',
    config: 'english' 
  });

// 4. Transactions (use RPC for complex operations)
const { data, error } = await supabase.rpc('transfer_funds', {
  from_account: 'A',
  to_account: 'B',
  amount: 100
});

// SQL function for transaction:
-- CREATE OR REPLACE FUNCTION transfer_funds(...)
-- RETURNS void AS $$
-- BEGIN
--   -- All operations in a transaction
--   UPDATE accounts SET balance = balance - amount WHERE id = from_account;
--   UPDATE accounts SET balance = balance + amount WHERE id = to_account;
-- END;
-- $$ LANGUAGE plpgsql;

// 5. Handling concurrent updates
const { data: post, error: fetchError } = await supabase
  .from('posts')
  .select('*, version')
  .eq('id', postId)
  .single();

// Update with version check
const { data, error } = await supabase
  .from('posts')
  .update({ 
    content: newContent, 
    version: post.version + 1 
  })
  .eq('id', postId)
  .eq('version', post.version) // Optimistic locking
  .select()
  .single();

if (error?.code === 'PGRST116') {
  // No rows updated - version conflict
  throw new Error('Post was modified by another user. Please refresh.');
}
```

---

### 📦 5. Storage (File Upload) Best Practices

```typescript
// ✅ GOOD: Secure file upload with validation
async function uploadFile(file: File, userId: string) {
  // 1. Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }

  // 2. Validate file size (e.g., 5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit.');
  }

  // 3. Generate unique filename to prevent collisions
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  // 4. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false // Prevent overwriting
    });

  if (error) throw error;

  // 5. Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ✅ GOOD: Storage bucket policies (SQL)
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false); -- private bucket

-- RLS for storage
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own avatar"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for public buckets
CREATE POLICY "Public read access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'public-images');

// ✅ GOOD: Download file
async function downloadFile(filePath: string) {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  if (error) throw error;

  // Create download link
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filePath.split('/').pop() || 'download';
  a.click();
  URL.revokeObjectURL(url);
}

// ✅ GOOD: Delete file
async function deleteFile(filePath: string) {
  const { error } = await supabase.storage
    .from('avatars')
    .remove([filePath]);

  if (error) throw error;
}

// ✅ GOOD: List files in folder
async function listUserFiles(userId: string) {
  const { data, error } = await supabase.storage
    .from('documents')
    .list(userId, {
      limit: 100,
    sortBy: { column: 'created_at', order: 'desc' }
  });

  if (error) throw error;
  return data;
}
```

**Storage Edge Cases:**

```typescript
// 1. Handle duplicate filenames
async function uploadWithRetry(file: File, userId: string, attempt = 0) {
  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const fileName = attempt === 0 
    ? `${userId}/${timestamp}.${fileExt}`
    : `${userId}/${timestamp}-${attempt}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file);

  if (error?.message?.includes('duplicate') && attempt < 3) {
    return uploadWithRetry(file, userId, attempt + 1);
  }

  if (error) throw error;
  return data;
}

// 2. Clean up old files when uploading new ones
async function replaceAvatar(file: File, userId: string) {
  // List existing avatars
  const { data: existingFiles } = await supabase.storage
    .from('avatars')
    .list(userId);

  // Upload new avatar
  const newFile = await uploadFile(file, userId);

  // Delete old avatars
  if (existingFiles && existingFiles.length > 0) {
    const filePaths = existingFiles.map(f => `${userId}/${f.name}`);
    await supabase.storage.from('avatars').remove(filePaths);
  }

  return newFile;
}

// 3. Signed URLs for temporary access
async function getSignedUrl(filePath: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('private-documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
```

---

### ⚡ 6. Realtime Subscriptions

```typescript
// ✅ GOOD: Subscribe to table changes
const subscription = supabase
  .channel('posts-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE, or *
      schema: 'public',
      table: 'posts'
    },
    (payload) => {
      console.log('Change detected:', payload);
      
      if (payload.eventType === 'INSERT') {
        // Add new post to state
        setPosts(prev => [payload.new, ...prev]);
      }
      
      if (payload.eventType === 'UPDATE') {
        // Update existing post
        setPosts(prev => 
          prev.map(post => 
            post.id === payload.new.id ? payload.new : post
          )
        );
      }
      
      if (payload.eventType === 'DELETE') {
        // Remove deleted post
        setPosts(prev => 
          prev.filter(post => post.id !== payload.old.id)
        );
      }
    }
  )
  .subscribe();

// ⚠️ IMPORTANT: Unsubscribe when component unmounts
useEffect(() => {
  return () => {
    subscription.unsubscribe();
  };
}, []);

// ✅ GOOD: Filter realtime updates
const subscription = supabase
  .channel('user-posts')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'posts',
      filter: `user_id=eq.${userId}` // Only changes for this user
    },
    (payload) => {
      console.log('User post changed:', payload);
    }
  )
  .subscribe();

// ✅ GOOD: Presence (track online users)
const channel = supabase.channel('online-users', {
  config: {
    presence: {
      key: userId,
    },
  },
});

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', state);
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => {
    console.log('User joined:', newPresences);
  })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => {
    console.log('User left:', leftPresences);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }
  });

// ✅ GOOD: Broadcast (send messages between clients)
const channel = supabase.channel('chat-room');

channel
  .on('broadcast', { event: 'message' }, (payload) => {
    console.log('Received message:', payload);
  })
  .subscribe();

// Send message
await channel.send({
  type: 'broadcast',
  event: 'message',
  payload: { text: 'Hello!', user: userId },
});
```

**Realtime Edge Cases:**

```typescript
// 1. Handle subscription errors
channel
  .on('system', {}, (payload) => {
    console.log('System event:', payload);
    
    if (payload.status === 'CHANNEL_ERROR') {
      // Reconnect logic
      setTimeout(() => {
        channel.subscribe();
      }, 1000);
    }
  })
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('Subscription error:', error);
    }
  });

// 2. Debounce rapid updates
const debouncedUpdate = debounce((payload) => {
  // Process update
  updateState(payload);
}, 300);

channel.on('postgres_changes', {}, debouncedUpdate);

// 3. Handle reconnection after network loss
window.addEventListener('online', () => {
  // Resubscribe to channels
  channel.subscribe();
  
  // Fetch missed updates
  fetchMissedUpdates();
});

// 4. Memory leak prevention
const subscriptions = new Map();

function subscribeToPost(postId) {
  // Unsubscribe from previous subscription
  if (subscriptions.has(postId)) {
    subscriptions.get(postId).unsubscribe();
  }

  const sub = supabase
    .channel(`post-${postId}`)
    .on('postgres_changes', { 
      filter: `id=eq.${postId}` 
    }, handleUpdate)
    .subscribe();

  subscriptions.set(postId, sub);
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    subscriptions.forEach(sub => sub.unsubscribe());
    subscriptions.clear();
  };
}, []);
```

---

### 🔧 7. Edge Functions (Serverless)

```typescript
// supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // 1. CORS handling
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // 2. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Process request
    const { to, subject, body } = await req.json();

    // Validate input
    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Perform operation (send email, call external API, etc.)
    // ... your business logic ...

    // 7. Return response
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent' }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

**Calling Edge Functions:**

```typescript
// From client
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thanks for signing up!'
  }
});

if (error) {
  console.error('Edge function error:', error);
}
```

---

### ⚠️ 8. Common Pitfalls & Solutions

```typescript
// PITFALL 1: Forgetting to enable RLS
// ❌ BAD: Table without RLS is exposed to everyone
CREATE TABLE sensitive_data (id UUID, secret TEXT);

// ✅ GOOD: Always enable RLS
CREATE TABLE sensitive_data (id UUID, secret TEXT);
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

// PITFALL 2: Using service role key in client
// ❌ BAD: Exposes full database access
const supabase = createClient(url, SERVICE_ROLE_KEY); // In React component

// ✅ GOOD: Use anon key in client, service role only in API routes
const supabase = createClient(url, ANON_KEY);

// PITFALL 3: Not handling auth state changes
// ❌ BAD: Assuming user is always authenticated
const user = supabase.auth.getUser(); // Might be null

// ✅ GOOD: Listen to auth changes
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null);
  });
}, []);

// PITFALL 4: Not unsubscribing from realtime
// ❌ BAD: Memory leak
supabase.channel('posts').subscribe();

// ✅ GOOD: Unsubscribe on cleanup
useEffect(() => {
  const subscription = supabase.channel('posts').subscribe();
  return () => subscription.unsubscribe();
}, []);

// PITFALL 5: Not handling pagination
// ❌ BAD: Fetching all rows (slow for large tables)
const { data } = await supabase.from('posts').select('*');

// ✅ GOOD: Paginate results
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(0, 9) // Fetch 10 items
  .order('created_at', { ascending: false });

// PITFALL 6: Exposing sensitive data in RLS policies
// ❌ BAD: Leaking data through policy
CREATE POLICY "Anyone can read if password matches"
  ON users FOR SELECT
  USING (password = 'secret123'); -- Don't do this!

// ✅ GOOD: Proper access control
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

// PITFALL 7: Not validating file uploads
// ❌ BAD: Accepting any file
const { data } = await supabase.storage
  .from('uploads')
  .upload(fileName, file); // No validation!

// ✅ GOOD: Validate before upload
if (file.size > 5_000_000) throw new Error('File too large');
if (!['image/jpeg', 'image/png'].includes(file.type)) {
  throw new Error('Invalid file type');
}

// PITFALL 8: Not handling race conditions
// ❌ BAD: Multiple updates can conflict
const { data: post } = await supabase.from('posts').select('*').single();
post.views += 1;
await supabase.from('posts').update({ views: post.views });

// ✅ GOOD: Use PostgreSQL's atomic operations
await supabase.rpc('increment_views', { post_id: postId });

-- CREATE FUNCTION increment_views(post_id UUID)
-- RETURNS void AS $$
-- BEGIN
--   UPDATE posts SET views = views + 1 WHERE id = post_id;
-- END;
-- $$ LANGUAGE plpgsql;
```

---

### 📊 9. Performance Optimization

```typescript
// 1. Use indexes for frequently queried columns
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

// 2. Limit selected columns
const { data } = await supabase
  .from('users')
  .select('id, email, display_name') // Only what you need
  .eq('id', userId)
  .single();

// 3. Use connection pooling (automatic in Supabase)
// Supabase handles this for you, but be aware of connection limits

// 4. Batch operations
// Instead of:
for (const item of items) {
  await supabase.from('table').insert(item);
}

// Do:
await supabase.from('table').insert(items);

// 5. Use materialized views for complex queries
CREATE MATERIALIZED VIEW user_post_counts AS
SELECT user_id, COUNT(*) as post_count
FROM posts
GROUP BY user_id;

// Refresh periodically
REFRESH MATERIALIZED VIEW user_post_counts;

// 6. Cache expensive queries
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['posts', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId);
    return data;
  },
  staleTime: 1000 * 60 * 5, // Cache for 5 minutes
});
```

---

### 🔍 10. Testing with Supabase

```typescript
// Use Supabase local development
// supabase init
// supabase start

// Test with local instance
const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Local anon key
);

// Integration test example
describe('User API', () => {
  beforeEach(async () => {
    // Reset database
    await supabase.rpc('reset_test_data');
  });

  it('should create a new user', async () => {
    const { data, error } = await supabase
      .from('users')
      .insert({ email: 'test@example.com' })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.email).toBe('test@example.com');
  });

  it('should respect RLS policies', async () => {
    // Try to access another user's data
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'other-user-id')
      .single();

    expect(data).toBeNull();
    expect(error).toBeDefined();
  });
});
```

---

## Mobile-First Frontend Development

### Core Principles
**Mobile-first means designing for small screens FIRST, then scaling up to desktop.**

```css
/* ✅ GOOD: Mobile-first (default styles for mobile) */
.button {
  padding: 12px 16px;
  font-size: 14px;
}

/* Then add desktop styles */
@media (min-width: 768px) {
  .button {
    padding: 16px 24px;
    font-size: 16px;
  }
}

/* ❌ BAD: Desktop-first */
.button {
  padding: 16px 24px; /* Desktop size */
}

@media (max-width: 768px) {
  .button {
    padding: 12px 16px; /* Cramming into mobile */
  }
}
```

---

### 📱 Mobile-First Checklist

#### 1. **Touch-Friendly Targets**
```tsx
// ✅ GOOD: Minimum 44x44px tap targets
<Button className="h-12 min-w-12 px-4">
  Click Me
</Button>

// ❌ BAD: Too small for fingers
<button className="h-6 w-6 p-1">×</button>
```

#### 2. **Responsive Typography**
```tsx
// ✅ GOOD: Scale text for mobile
<h1 className="text-2xl md:text-4xl lg:text-5xl font-bold">
  Heading
</h1>

<p className="text-sm md:text-base leading-relaxed">
  Body text
</p>

// Key: Smaller on mobile, larger on desktop
```

#### 3. **Responsive Layouts**
```tsx
// ✅ GOOD: Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

// ✅ GOOD: Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

#### 4. **Mobile Navigation**
```tsx
// components/MobileNav.tsx
'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden">
          <div className="fixed inset-y-0 right-0 w-3/4 max-w-sm bg-white p-6">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4"
            >
              <X size={24} />
            </button>
            
            <nav className="mt-8 space-y-4">
              <a href="/" className="block py-2 text-lg">Home</a>
              <a href="/about" className="block py-2 text-lg">About</a>
              <a href="/contact" className="block py-2 text-lg">Contact</a>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
```

#### 5. **Responsive Images**
```tsx
// ✅ GOOD: Next.js Image optimization
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  className="w-full h-auto"
  priority // For above-fold images
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// ✅ GOOD: Responsive background
<div 
  className="h-48 md:h-64 lg:h-96 bg-cover bg-center"
  style={{ backgroundImage: 'url(/hero.jpg)' }}
/>
```

#### 6. **Form Inputs**
```tsx
// ✅ GOOD: Mobile-optimized forms
<form className="space-y-4 w-full max-w-md mx-auto p-4">
  <input
    type="email"
    placeholder="Email"
    className="w-full h-12 px-4 text-base border rounded-lg"
    // h-12 = 48px (good tap target)
    // text-base = 16px (prevents zoom on iOS)
  />
  
  <input
    type="tel"
    placeholder="Phone"
    className="w-full h-12 px-4 text-base border rounded-lg"
    inputMode="numeric" // Shows number keyboard on mobile
  />
  
  <button 
    type="submit"
    className="w-full h-12 bg-blue-600 text-white rounded-lg font-medium"
  >
    Submit
  </button>
</form>

// Key points:
// - h-12 minimum for touch targets
// - text-base (16px) prevents auto-zoom on iOS
// - inputMode for correct mobile keyboard
// - w-full on mobile for easy tapping
```

#### 7. **Loading States**
```tsx
// ✅ GOOD: Mobile-friendly loading
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}

// ✅ GOOD: Skeleton loading for better UX
export function PostSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}
```

#### 8. **Modals & Dialogs**
```tsx
// ✅ GOOD: Mobile-responsive modal
import { Dialog } from '@/components/ui/dialog';

<Dialog>
  <DialogContent className="w-[95vw] max-w-md mx-auto">
    {/* 95vw on mobile = doesn't touch edges */}
    {/* max-w-md on desktop = reasonable width */}
    <DialogTitle>Confirm Action</DialogTitle>
    <DialogDescription>
      Are you sure you want to continue?
    </DialogDescription>
    <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button variant="outline" className="w-full sm:w-auto">
        Cancel
      </Button>
      <Button className="w-full sm:w-auto">
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 🎨 Recommended UI Component Library

**shadcn/ui** (built on Radix UI + Tailwind)

**Why shadcn/ui?**
- ✅ Copy-paste components (you own the code)
- ✅ Fully customizable
- ✅ Accessible (keyboard + screen reader support)
- ✅ Mobile-friendly out of the box
- ✅ Works perfectly with Tailwind
- ✅ No runtime bundle size (just copies code)

**Setup:**
```bash
npx shadcn-ui@latest init

# Install components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

<Button size="lg" className="w-full md:w-auto">
  Click Me
</Button>

<Input 
  type="email" 
  placeholder="Enter email"
  className="h-12" // Mobile-friendly height
/>
```

---

### 🔄 State Management for Mobile

#### **1. React Query (for Server State)**
```tsx
// Perfect for Supabase data fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch data with caching
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Usage in component
function PostList() {
  const { data: posts, isLoading, error } = usePosts();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="space-y-4">
      {posts?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}

// Mutations with optimistic updates
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newPost) => {
      const { data, error } = await supabase
        .from('posts')
        .insert(newPost)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refetch posts after creation
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

#### **2. Zustand (for Client State)**
```tsx
// stores/userStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage', // LocalStorage key
    }
  )
);

// Usage in components
function Header() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
  };
  
  return (
    <header>
      {user ? (
        <>
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </header>
  );
}
```

---

### 📱 Mobile-Specific Hooks

```tsx
// hooks/useMobile.ts
'use client';

import { useState, useEffect } from 'react';

export function useMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check on mount
    checkMobile();
    
    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Usage
function MyComponent() {
  const isMobile = useMobile();
  
  return (
    <div>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}

// hooks/useMediaQuery.ts
'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Usage
function ResponsiveComponent() {
  const isSmall = useMediaQuery('(max-width: 640px)');
  const isMedium = useMediaQuery('(max-width: 768px)');
  const isLarge = useMediaQuery('(min-width: 1024px)');
  
  return (
    <div>
      {isSmall && <SmallView />}
      {isMedium && !isSmall && <MediumView />}
      {isLarge && <LargeView />}
    </div>
  );
}
```

---

### 🚀 Performance Optimization for Mobile

#### 1. **Code Splitting**
```tsx
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

// Load only when needed (saves initial bundle size)
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // Don't render on server
});

function Dashboard() {
  return (
    <div>
      <LightweightStats />
      {/* Only loads when component mounts */}
      <HeavyChart />
    </div>
  );
}
```

#### 2. **Image Optimization**
```tsx
// Next.js automatically optimizes images
import Image from 'next/image';

<Image
  src="/product.jpg"
  alt="Product"
  width={400}
  height={300}
  loading="lazy" // Lazy load offscreen images
  placeholder="blur" // Show blur while loading
  blurDataURL="data:image/jpeg;base64,..."
/>

// Or use blur placeholder automatically
import productImage from '@/public/product.jpg';

<Image
  src={productImage}
  alt="Product"
  placeholder="blur" // Auto-generates blur
/>
```

#### 3. **Reduce JavaScript Bundle**
```tsx
// ✅ GOOD: Import only what you need
import { useState, useEffect } from 'react';

// ❌ BAD: Imports entire library
import _ from 'lodash';

// ✅ GOOD: Import specific function
import debounce from 'lodash/debounce';

// ✅ GOOD: Use native JavaScript when possible
const unique = [...new Set(array)]; // Instead of _.uniq
```

#### 4. **Memoization**
```tsx
import { memo, useMemo, useCallback } from 'react';

// Prevent unnecessary re-renders
const PostCard = memo(({ post }) => {
  return <div>{post.title}</div>;
});

// Memoize expensive calculations
function PostList({ posts }) {
  const sortedPosts = useMemo(() => {
    return posts.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  }, [posts]);
  
  return sortedPosts.map(post => <PostCard key={post.id} post={post} />);
}

// Memoize callbacks
function SearchBar({ onSearch }) {
  const handleSearch = useCallback(
    debounce((query) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );
  
  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

---

### 🎯 Mobile Testing

```typescript
// Test on different viewports
describe('Mobile Responsiveness', () => {
  it('should show mobile menu on small screens', () => {
    cy.viewport(375, 667); // iPhone SE
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    cy.get('[data-testid="desktop-menu"]').should('not.be.visible');
  });
  
  it('should show desktop menu on large screens', () => {
    cy.viewport(1280, 720); // Desktop
    cy.get('[data-testid="mobile-menu-button"]').should('not.be.visible');
    cy.get('[data-testid="desktop-menu"]').should('be.visible');
  });
});

// Common mobile viewports to test
const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12 Pro', width: 390, height: 844 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
];
```

---

### 🎨 Common Mobile-First Patterns

#### Pattern 1: Responsive Container
```tsx
// Reusable container component
export function Container({ children, className = '' }) {
  return (
    <div className={`
      container 
      mx-auto 
      px-4 sm:px-6 lg:px-8 
      max-w-7xl
      ${className}
    `}>
      {children}
    </div>
  );
}
```

#### Pattern 2: Stacked to Horizontal Layout
```tsx
// Mobile: stacked vertically
// Desktop: side by side
<div className="flex flex-col md:flex-row gap-4">
  <aside className="w-full md:w-64">Sidebar</aside>
  <main className="flex-1">Main Content</main>
</div>
```

#### Pattern 3: Hidden/Visible by Breakpoint
```tsx
// Show different content for mobile vs desktop
<>
  {/* Mobile only */}
  <div className="block md:hidden">
    <MobileSidebar />
  </div>
  
  {/* Desktop only */}
  <div className="hidden md:block">
    <DesktopSidebar />
  </div>
</>
```

#### Pattern 4: Bottom Sheet (Mobile) vs Modal (Desktop)
```tsx
// Mobile: slides up from bottom
// Desktop: center modal
<Dialog>
  <DialogContent className="
    sm:max-w-md
    bottom-0 sm:bottom-auto
    rounded-t-xl sm:rounded-xl
    max-h-[90vh] sm:max-h-auto
  ">
    {/* Content */}
  </DialogContent>
</Dialog>
```

#### Pattern 5: Infinite Scroll (Mobile) vs Pagination (Desktop)
```tsx
function PostList() {
  const isMobile = useMobile();
  
  if (isMobile) {
    return <InfiniteScrollList />;
  }
  
  return <PaginatedList />;
}
```

---

### ⚠️ Mobile Anti-Patterns (What NOT to Do)

#### ❌ Anti-Pattern 1: Tiny Touch Targets
```tsx
// BAD: Too small for fingers
<button className="w-6 h-6 p-0">×</button>

// GOOD: Minimum 44x44px
<button className="w-11 h-11 flex items-center justify-center">
  <X size={20} />
</button>
```

#### ❌ Anti-Pattern 2: Horizontal Scrolling
```tsx
// BAD: Horizontal scroll on mobile is awkward
<div className="flex gap-4 overflow-x-auto">
  {items.map(item => (
    <div className="min-w-[300px]">...</div>
  ))}
</div>

// GOOD: Stack vertically on mobile
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {items.map(item => (
    <div>...</div>
  ))}
</div>
```

#### ❌ Anti-Pattern 3: Fixed Pixel Widths
```tsx
// BAD: Breaks on small screens
<div style={{ width: '800px' }}>Content</div>

// GOOD: Responsive width
<div className="w-full max-w-3xl mx-auto">Content</div>
```

#### ❌ Anti-Pattern 4: Desktop-First Media Queries
```css
/* BAD: Desktop-first */
.element { 
  font-size: 24px; 
}

@media (max-width: 768px) {
  .element { 
    font-size: 16px; 
  }
}

/* GOOD: Mobile-first */
.element { 
  font-size: 16px; 
}

@media (min-width: 768px) {
  .element { 
    font-size: 24px; 
  }
}
```

#### ❌ Anti-Pattern 5: Hover-Dependent UI
```tsx
// BAD: Requires hover (doesn't work on touch)
<div className="group">
  <button>Menu</button>
  <div className="hidden group-hover:block">
    Dropdown content
  </div>
</div>

// GOOD: Click/tap to toggle
const [isOpen, setIsOpen] = useState(false);

<div>
  <button onClick={() => setIsOpen(!isOpen)}>Menu</button>
  {isOpen && (
    <div>Dropdown content</div>
  )}
</div>
```

#### ❌ Anti-Pattern 6: Text Below 16px (iOS Auto-Zoom)
```tsx
// BAD: Causes zoom on iOS
<input className="text-sm" /> // 14px

// GOOD: Prevents auto-zoom
<input className="text-base" /> // 16px
```

#### ❌ Anti-Pattern 7: Too Much Content Above the Fold
```tsx
// BAD: Overwhelming on mobile
<header className="h-64">
  <Hero />
  <Navigation />
  <SearchBar />
  <Filters />
</header>

// GOOD: Minimal header, content above fold
<header className="h-16 md:h-20">
  <Logo />
  <MobileMenu />
</header>
```

---

### 📋 Mobile Development Checklist

Before deploying:

- [ ] Test on real mobile devices (not just browser DevTools)
- [ ] Check touch targets (minimum 44x44px)
- [ ] Verify text is readable (minimum 16px for body)
- [ ] Test forms on mobile (no auto-zoom on iOS)
- [ ] Check loading states on slow 3G
- [ ] Verify images are optimized and responsive
- [ ] Test navigation (hamburger menu works smoothly)
- [ ] Check scroll performance (no jank)
- [ ] Verify modals/dialogs fit on small screens
- [ ] Test offline behavior (if using PWA)
- [ ] Run Lighthouse mobile audit (aim for 90+ score)
- [ ] Test on both iOS and Android
- [ ] Check landscape orientation
- [ ] Verify safe areas for notched devices

---

## Checklist for Production Launch

- [ ] SSL certificate configured
- [ ] Environment variables secured
- [ ] Database backups automated
- [ ] Error monitoring active
- [ ] Performance monitoring active
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Logging in place
- [ ] Documentation complete
- [ ] Tests passing (>80% coverage)
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Monitoring alerts configured
- [ ] Privacy policy and terms of service

### Supabase-Specific Checklist
- [ ] RLS enabled on ALL tables
- [ ] RLS policies tested and verified
- [ ] Service role key stored securely (never in client code)
- [ ] Anon key used in client applications
- [ ] Auth email templates customized
- [ ] Email confirmation enabled (if required)
- [ ] Password policies configured
- [ ] Storage bucket policies configured
- [ ] Storage file size limits set
- [ ] Realtime subscriptions tested
- [ ] Edge Functions deployed and tested
- [ ] Database indexes created for performance
- [ ] Connection pooling configured
- [ ] Backup schedule verified
- [ ] Migration scripts version controlled
- [ ] Supabase project moved to production tier
- [ ] Custom domain configured (if applicable)
- [ ] API rate limits understood and monitored
- [ ] Webhooks configured (if using)
- [ ] Supabase logs reviewed regularly

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web.dev Performance](https://web.dev/performance/)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [TypeScript Best Practices](https://typescript-book.com/)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Remember**: Write code as if the person maintaining it is a violent psychopath who knows where you live. Make it clear, well-documented, and easy to understand.