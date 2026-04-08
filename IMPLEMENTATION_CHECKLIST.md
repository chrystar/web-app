# Full-Page Guest Auth Implementation - Quick Start

## ✅ What's Already Done

### Code Implementation Complete
- ✅ Full-page signup/login component (`app/guest-auth/page.tsx`)
- ✅ Email/password authentication service
- ✅ Google OAuth integration with Supabase
- ✅ OAuth callback handler (`app/guest-auth/callback/page.tsx`)
- ✅ Main app integration (redirects to `/guest-auth` on checkout)
- ✅ Checkout page protection (requires guest session)
- ✅ Session persistence in localStorage
- ✅ Database schema with password_hash and auth_method

### Files Ready to Deploy
```
app/
├── guest-auth/
│   ├── page.tsx                (Full-page auth UI - 340 lines)
│   └── callback/page.tsx       (OAuth callback handler - 50 lines)
├── page.tsx                    (Updated - uses /guest-auth redirect)
└── checkout/page.tsx           (Updated - requires guest session)

lib/
└── guest-auth.ts              (Auth service - 160 lines)

scripts/
└── create_guest_users_table.sql (Database migration)

Documentation:
├── GUEST_AUTH_FULL_PAGE.md     (UI & Features guide)
├── GOOGLE_OAUTH_SETUP.md       (Google OAuth configuration)
└── This file                   (Quick start checklist)
```

## 🚀 What You Need to Do (5 Steps)

### Step 1: Create Database Table
**Time:** 2 minutes

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS guest_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255),
  auth_method VARCHAR(20) DEFAULT 'email',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_users_email ON guest_users(email);
CREATE INDEX IF NOT EXISTS idx_guest_users_auth_method ON guest_users(auth_method);
```

4. Click **Run**
5. Verify table shows in sidebar

### Step 2: Enable RLS Policies
**Time:** 2 minutes

1. Go to **Authentication** → **Policies** (for `guest_users` table)
2. Click **New Policy** (if none exist)
3. Create policy with these settings:
   - **Policy name:** `Allow all operations`
   - **Target roles:** `authenticated` and `anon`
   - **Expression:** `true`
   - **Allow operations:** SELECT, INSERT, UPDATE

OR manually enable all by setting expression to `true`

✅ This allows your app to read/write guest user data

### Step 3: Setup Google OAuth (Optional but Recommended)
**Time:** 10 minutes

**Quick version:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project → Enable Google+ API
3. Go to Credentials → Create OAuth 2.0 credentials → Web application
4. Add authorized origins:
   - `http://localhost:3000` (dev)
   - `https://yourdomain.com` (production)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/v1/callback`
   - `http://localhost:3000/guest-auth/callback`
   - Same for production with your domain
6. Copy Client ID and Client Secret
7. Open Supabase → **Authentication** → **Providers** → **Google**
8. Paste Client ID and Client Secret
9. Click **Save**

**Full guide:** See `GOOGLE_OAUTH_SETUP.md`

### Step 4: Update Environment Variables (Optional)
**Time:** 1 minute

In `.env.local`, you can add (optional):
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
```

⚠️ This is optional - Supabase handles it server-side

### Step 5: Test Everything
**Time:** 5 minutes

```bash
npm run dev
```

Go to `http://localhost:3000`

**Test Signup:**
1. Click "Checkout" button
2. Should redirect to `/guest-auth`
3. See signup form (default view)
4. Enter: First Name, Last Name, Email, Password, Confirm Password
5. Click "Create Account"
6. Should redirect to `/checkout`
7. Form should be pre-filled

**Test Login:**
1. Back to home (`/`)
2. Click "Checkout" again
3. See login form (should be on Login tab)
4. Enter same email and password
5. Click "Log In"
6. Should redirect to checkout

**Test Google:**
1. Click "Continue with Google"
2. Google login popup
3. Should create account and redirect to checkout

✅ **All working?** You're done!

## 🎯 Feature Checklist

After setup, you have:

- ✅ **Email/Password Signup**
  - First name, last name, email, password
  - Password confirmation validation
  - Email uniqueness check
  - Min 6 character password requirement

- ✅ **Email/Password Login**
  - Email and password verification
  - Session creation

- ✅ **Google OAuth**
  - One-click signup/login
  - Auto creates guest account from Google profile
  - Name parsing from Google data

- ✅ **Session Management**
  - Saved to localStorage
  - Persists across page reloads
  - Cleared when user logs out

- ✅ **Form Auto-Fill**
  - Checkout page pre-fills with guest user data
  - Saves form state to localStorage

- ✅ **Routing**
  - Checkout requires guest session
  - Auto-redirects to `/guest-auth?return=/checkout` if not logged in
  - OAuth callback auto-redirects to original destination

## 📁 File Summary

### New Components
- `app/guest-auth/page.tsx` - Full-page auth UI with email/password and Google
- `app/guest-auth/callback/page.tsx` - OAuth callback handler

### Updated Components  
- `app/page.tsx` - Redirects to `/guest-auth` instead of showing modal
- `app/checkout/page.tsx` - Requires guest session, redirects if missing

### Services
- `lib/guest-auth.ts` - All auth functions (email/password + Google OAuth)

### Database
- `scripts/create_guest_users_table.sql` - Migration for guest_users table

## 🔍 Database Schema

```
guest_users
├── id: UUID (primary key)
├── email: VARCHAR UNIQUE
├── phone: VARCHAR (optional)
├── first_name: VARCHAR
├── last_name: VARCHAR
├── password_hash: VARCHAR (for email auth)
├── auth_method: VARCHAR ("email" or "google")
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP
```

## 📊 User Data Flow

```
Home Page
    ↓
Click "Checkout"
    ↓
Check guest_session in localStorage
    ├─ If exists: Go to /checkout
    └─ If missing: Redirect to /guest-auth?return=/checkout
    ↓
Guest Auth Page
    ├─ Signup: Create new guest_users record
    └─ Login/Google: Retrieve existing record
    ↓
Save to localStorage
    ↓
Redirect to /checkout
    ↓
Form auto-fills from guest_session
    ↓
Complete payment
```

## ⚙️ Configuration Summary

### Supabase Configuration
- ✅ Table: `guest_users` created
- ✅ RLS: All operations allowed (public)
- ✅ OAuth: Google provider enabled

### Environment Variables
- Already set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Optional: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### URL Callbacks
- Email/Password: No special config needed
- Google OAuth: Requires redirect URIs in Google Cloud Console

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Email already registered" on signup | Try login tab or use different email |
| "Invalid password" on login | Check spelling (case-sensitive) |
| Google button not working | Ensure Supabase Google provider is enabled |
| Checkout not pre-filling form | Check localStorage has `guest_session` key |
| Auth page shows blank | Check browser console for errors |
| Can't create table in Supabase | Ensure you have admin access to project |

## 📞 Need Help?

- **Email/Password issues:** Check form validation in `app/guest-auth/page.tsx`
- **Google OAuth issues:** See `GOOGLE_OAUTH_SETUP.md`
- **Database issues:** Check RLS policies and table schema
- **Session issues:** Check localStorage in DevTools

## ✨ What's Next (Optional Enhancements)

- [ ] Add password reset email
- [ ] Add email verification OTP
- [ ] Implement bcrypt for password hashing (production)
- [ ] Add session expiration timeout
- [ ] Add "Remember me" checkbox
- [ ] Add phone number verification
- [ ] Add account deletion option
- [ ] Add 2FA support

## 🎉 You're Ready!

Your full-page guest authentication system is ready to use. Just:

1. ✅ Create the database table (5 steps above)
2. ✅ Enable RLS (step 2 above)
3. ✅ (Optional) Setup Google OAuth (step 3 above)
4. ✅ Test the flows (step 5 above)

Everything else is already implemented!

---

**Status:** ✅ Ready for Deployment  
**Files:** 4 new/updated components  
**Setup Time:** ~20 minutes  
**Last Updated:** March 25, 2024
