# Production Readiness Analysis - Frost Chicken App

**Date:** April 1, 2026  
**Status:** ⚠️ **CRITICAL ISSUES FOUND - DO NOT DEPLOY**

---

## Executive Summary

The application has **5 critical issues**, **8 high-priority issues**, and **6 medium-priority issues** that must be resolved before production deployment. Most critical: **plaintext password storage**, **font configuration mismatch**, **development mode fallbacks in production code**, and **missing input validation**.

---

## 🔴 CRITICAL ISSUES (Blocking Production)

### 1. **Plaintext Password Storage** ⚠️ SECURITY CRITICAL
**File:** `lib/guest-auth.ts` (lines 43, 86)  
**Severity:** CRITICAL - Security vulnerability  

**Problem:**
```typescript
// Line 43: Storing plaintext password
password_hash: data.password,

// Line 86: Comparing plaintext passwords (no hashing)
if (user.password_hash !== data.password) {
  throw new Error("Invalid password");
}
```

**Impact:** All guest user passwords are stored in plaintext. If database is compromised, all passwords are exposed.

**Fix Required:**
- Install bcrypt: `npm install bcrypt`
- Hash passwords on signup:
```typescript
const hash = await bcrypt.hash(data.password, 10);
const { data: newUser } = await supabase
  .from("guest_users")
  .insert({ password_hash: hash, ... })
```
- Compare hashed passwords on login:
```typescript
const passwordMatch = await bcrypt.compare(data.password, user.password_hash);
if (!passwordMatch) throw new Error("Invalid password");
```

**Timeline:** Fix immediately before any production deployment.

---

### 2. **Development Mode Payment Verification Bypass** ⚠️ CRITICAL
**File:** `app/api/orders/route.ts` (lines 71, 79)  
**Severity:** CRITICAL - Security vulnerability  

**Problem:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Development mode: allowing payment without verification');
  paymentVerified = true; // ❌ Skips Paystack verification in dev
}
```

**Impact:** If deployed to production with `NODE_ENV=development`, Paystack payments are not verified. Anyone can create orders without payment.

**Fix Required:**
```typescript
// PRODUCTION: Remove all NODE_ENV === 'development' fallbacks from payment verification
if (!paymentVerified) {
  return Response.json(
    { error: 'Payment verification failed' },
    { status: 400 }
  );
}
// No fallback for failed verification
```

Ensure `.env.production` has `NODE_ENV=production` set explicitly.

**Timeline:** Must be fixed before production deployment.

---

### 3. **Font Configuration Mismatch** ⚠️ APPLICATION CRITICAL
**Files:** 
- `app/layout.tsx` (line 2) - Uses Geist font
- `app/globals.css` (lines 8-10) - References Inter font
- Previous updates switched to Inter but layout.tsx still uses Geist

**Severity:** CRITICAL - CSS font variables won't resolve

**Problem:**
```typescript
// layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", ... });
// ✅ Sets --font-geist-sans

// globals.css
@theme inline {
  --font-sans: var(--font-geist-sans); // ✅ This works
}
```
BUT you intended to use Inter (from previous updates). This is inconsistent.

**Current State:** 
- App loads Geist correctly
- But you wanted Inter globally
- Mixed state will cause font flickering or wrong font rendering

**Fix Required (Choose one approach):**

**Option A: Keep Geist (revert to original)**
```typescript
// layout.tsx - CURRENT (correct)
import { Geist, Geist_Mono } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
```
✅ This is correct and consistent.

**Option B: Switch to Inter (recommended per your earlier request)**
```typescript
// layout.tsx
import { Inter, Geist_Mono } from "next/font/google";
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body>...</body>
    </html>
  );
}

// globals.css
@theme inline {
  --font-sans: var(--font-inter);  // Changed from --font-geist-sans
  --font-mono: var(--font-geist-mono);
}
```

**Timeline:** Resolve before production (choose one and commit).

---

### 4. **Missing Environment Variable Validation** ⚠️ CRITICAL
**Files:** Multiple API routes  
**Severity:** CRITICAL - Runtime crashes if env vars missing

**Problem:**
```typescript
// app/api/orders/route.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,    // ❌ ! asserts non-null
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // ❌ Will be undefined in prod if not set
);

// If env var is missing, this creates broken client
```

**Impact:** If environment variables are not set correctly on production, the app silently creates broken Supabase clients and crashes at runtime with cryptic errors.

**Required Variables for Production:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
NEXT_PUBLIC_APP_URL
```

**Fix Required:**
Create a validation utility:
```typescript
// lib/env-validation.ts
export function validateEnv() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'PAYSTACK_SECRET_KEY',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Call in app/layout.tsx useEffect or at build time
```

**Timeline:** Implement before production deployment.

---

### 5. **Missing CSRF Protection & CORS Configuration** ⚠️ CRITICAL
**Files:** All API routes  
**Severity:** CRITICAL - API open to unauthorized requests

**Problem:**
- No CSRF tokens on POST/PUT/DELETE requests
- No CORS restrictions configured
- No rate limiting
- API endpoints accept requests from any origin

**Impact:** 
- Cross-site request forgery attacks possible
- API abuse/DDoS vulnerability
- Unauthorized data modification

**Fix Required:**
```typescript
// middleware.ts (create new file)
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'https://yourdomain.com'
    ];

    // Validate CORS
    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json({ error: 'CORS not allowed' }, { status: 403 });
    }

    // Rate limit check (implement with Redis/Upstash)
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

And update API routes:
```typescript
export async function POST(request: NextRequest) {
  // Validate Content-Type
  if (request.headers.get('content-type') !== 'application/json') {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  }
  // ... rest of handler
}
```

**Timeline:** Implement before production.

---

## 🟠 HIGH PRIORITY ISSUES (Must Fix)

### 6. **No Password Strength Validation**
**File:** `app/guest-auth/page.tsx` (lines 54-56)

**Current:**
```typescript
if (signupData.password.length < 6) {
  setError("Password must be at least 6 characters");
  return;
}
```

**Problem:** Only checks length, no complexity requirements (uppercase, numbers, special chars).

**Fix:**
```typescript
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(signupData.password)) {
  setError("Password must have 8+ chars with uppercase, lowercase, number, and special char");
  return;
}
```

---

### 7. **SQL Injection Risk in Search/Filter Operations**
**File:** `app/api/products/route.ts` (lines 8-11)

**Problem:**
```typescript
const search = searchParams.get("search");
// Direct use in query without sanitization
const products = await productService.searchProducts(search);
```

**Fix:** Add input validation:
```typescript
const search = searchParams.get("search");
if (search && search.length > 100) {
  return NextResponse.json({ error: 'Search term too long' }, { status: 400 });
}
// Supabase parameterized queries prevent SQL injection, but validate input length
```

---

### 8. **No API Input Validation**
**File:** `app/api/orders/route.ts` (line 47)

**Problem:**
```typescript
const body: CreateOrderRequest = await request.json();
// No validation of body structure, types, or ranges
```

**Fix:** Add zod validation:
```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  customerInfo: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    phone: z.string().regex(/^[\d+\-\(\) ]{10,15}$/),
    address: z.string().min(5).max(500),
  }),
  items: z.array(z.object({
    id: z.number(),
    name: z.string(),
    price: z.number().positive(),
    quantity: z.number().positive(),
  })),
  total: z.number().positive(),
});

const validatedBody = CreateOrderSchema.parse(body);
```

**Timeline:** Implement for critical endpoints.

---

### 9. **Payment Reference Not Validated for Format**
**File:** `app/checkout/page.tsx` (line 241)

**Problem:**
```typescript
ref: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
```

No server-side validation that payment reference matches format.

**Fix:**
```typescript
// In /api/orders route
const paymentRef = body.paymentReference;
if (!/^order_\d+_[a-z0-9]{9}$/.test(paymentRef)) {
  return NextResponse.json({ error: 'Invalid payment reference' }, { status: 400 });
}
```

---

### 10. **No Session Expiry for Guest Users**
**File:** `lib/guest-auth.ts` (line 150+)

**Problem:**
```typescript
setGuestSession(user) {
  localStorage.setItem('guest_session', JSON.stringify(user));
  // No expiry timestamp set
}
```

**Impact:** Guest session persists forever; security risk if device is compromised.

**Fix:**
```typescript
setGuestSession(user: GuestUser) {
  const sessionData = {
    user,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  localStorage.setItem('guest_session', JSON.stringify(sessionData));
}

getGuestSession(): GuestUser | null {
  const data = JSON.parse(localStorage.getItem('guest_session') || '{}');
  if (data.expiresAt && Date.now() > data.expiresAt) {
    localStorage.removeItem('guest_session');
    return null;
  }
  return data.user || null;
}
```

---

### 11. **Logging Sensitive Data**
**File:** `app/api/orders/route.ts` (lines 95, 259)

**Problem:**
```typescript
console.log('Order payload:', JSON.stringify(orderPayload, null, 2));
// Logs full order with customer email, phone, address to server logs
```

**Impact:** Production logs might be exposed; sensitive PII is logged.

**Fix:**
```typescript
console.log('Order created:', {
  orderId: order.id,
  itemCount: orderPayload.items.length,
  total: orderPayload.total,
  // Don't log: customerInfo, email, phone, address
});
```

---

### 12. **No Error Boundary for API Failures**
**File:** `app/page.tsx` (lines 85-94)

**Problem:**
```typescript
if (errorProducts) {
  return <div>{errorProducts}</div>; // Raw error shown to user
}
```

**Impact:** Users see cryptic server error messages; info disclosure.

**Fix:**
```typescript
if (errorProducts) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
      Failed to load products. Please try again later.
      {process.env.NODE_ENV === 'development' && <p className="text-xs mt-2">{errorProducts}</p>}
    </div>
  );
}
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 13. **Image Loading Performance**
**Files:** `app/page.tsx`, `app/products/[id]/page.tsx`

**Problem:**
- Next.js Image components used but no `loading="lazy"` or `priority` specified
- No width/height on all images (some are missing)
- Images might cause CLS (Cumulative Layout Shift)

**Fix:**
```typescript
<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  priority={false}
  loading="lazy"
  onError={() => setImageError(true)}
/>
```

---

### 14. **Missing Meta Tags for Security**
**File:** `app/layout.tsx`

**Problem:**
- No CSP (Content Security Policy) headers
- No X-Frame-Options
- No referrer policy

**Fix:** Update `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  // ... existing config
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "default-src 'self'" },
      ],
    },
  ],
};
```

---

### 15. **No Rate Limiting on Authentication**
**File:** `app/guest-auth/page.tsx` (line 47)

**Problem:**
- No rate limit on signup/login attempts
- Brute force password attacks possible

**Fix:** Use library like `@upstash/ratelimit` or implement with middleware.

---

### 16. **Cart Data Persisted Insecurely**
**File:** `app/page.tsx` (line 215+), `app/checkout/page.tsx` (line 110)

**Problem:**
```typescript
localStorage.setItem("cart", JSON.stringify(cart));
// Cart stored in plaintext localStorage
// User can manually modify quantities
```

**Impact:** Users can manipulate prices/quantities before checkout.

**Fix:**
```typescript
// Server-side cart validation
const cartPayload = {
  items: cart.map(item => ({ id: item.id, quantity: item.quantity }))
};

// Fetch fresh prices from API
const response = await fetch('/api/cart/validate', {
  method: 'POST',
  body: JSON.stringify(cartPayload)
});

const { validatedItems, total } = await response.json();
// Use server-calculated total, not client-side
```

---

### 17. **No Database Connection Pooling**
**Files:** All API routes create new Supabase clients

**Problem:**
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

Creates new client per request → depletes connection pool.

**Fix:** Use singleton pattern:
```typescript
// lib/supabase-admin.ts
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}
```

---

### 18. **No Monitoring/Alerting**
**Current:** No error tracking, no performance monitoring

**Required for Production:**
- Set up Sentry for error tracking
- Add Vercel Analytics
- Monitor payment failures
- Alert on database errors

---

## 📋 Production Deployment Checklist

### Pre-Deployment (MUST COMPLETE)
- [ ] **CRITICAL:** Fix plaintext password storage (bcrypt)
- [ ] **CRITICAL:** Remove `NODE_ENV === 'development'` payment verification bypass
- [ ] **CRITICAL:** Resolve font configuration (Geist vs Inter)
- [ ] **CRITICAL:** Validate all required environment variables
- [ ] **CRITICAL:** Implement CSRF/CORS protection
- [ ] Implement password strength validation
- [ ] Add API input validation (zod)
- [ ] Remove sensitive data from logs
- [ ] Add error boundaries with user-friendly messages
- [ ] Implement session expiry for guest users
- [ ] Set up .env.production correctly

### Before Going Live
- [ ] Run full security audit
- [ ] Test payment flow with real Paystack account
- [ ] Test all API endpoints for error handling
- [ ] Verify environment variables are set in production
- [ ] Test guest auth signup/login
- [ ] Test order creation flow end-to-end
- [ ] Verify image loading and optimization
- [ ] Check font loading (no FOUT/FLIC)
- [ ] Test on mobile devices
- [ ] Verify Supabase connection limits
- [ ] Set up monitoring (Sentry/Vercel)
- [ ] Configure CORS properly for your domain

### Post-Deployment
- [ ] Monitor error logs daily
- [ ] Check Paystack payment success rate
- [ ] Monitor API response times
- [ ] Verify no sensitive data in logs
- [ ] Track user signups and orders
- [ ] Monitor database performance

---

## Environment Variables Required

Create `.env.production`:
```bash
# Supabase (get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Paystack (get from Paystack dashboard)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

Verify in Vercel/deployment platform settings, not in repo.

---

## Summary by Severity

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 5 | Must fix before deploy |
| 🟠 High | 8 | Should fix before deploy |
| 🟡 Medium | 5 | Fix soon after launch |
| 🟢 Low | - | - |

**Estimated Fix Time:** 8-12 hours for all critical and high-priority issues.

---

## Next Steps

1. **Immediately:** Fix the 5 critical issues (password hashing, payment verification, fonts, env vars, CSRF)
2. **Before Deploy:** Implement high-priority fixes
3. **Create:** `.env.production` with correct sensitive values
4. **Test:** Full end-to-end flow with real payment
5. **Monitor:** Set up error tracking and performance monitoring
6. **Deploy:** Use Vercel or your hosting platform with environment variables configured

---

**Last Updated:** April 1, 2026  
**App Status:** ⚠️ NOT PRODUCTION READY
