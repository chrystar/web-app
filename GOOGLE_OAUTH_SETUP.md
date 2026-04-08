# Google OAuth Setup for Supabase

## Complete Setup Guide

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/v1/callback` (development)
     - `https://yourdomain.com/auth/v1/callback` (production)
     - `http://localhost:3000/guest-auth/callback` (guest auth)
     - `https://yourdomain.com/guest-auth/callback` (guest auth production)

5. Copy the **Client ID** and **Client Secret**

### Step 2: Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and click to enable
5. Paste your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
6. Click "Save"

### Step 3: Update Redirect URL in Supabase

The redirect URL should be set in Supabase settings:
- Go to **Authentication** → **URL Configuration**
- Set **Site URL**: `http://localhost:3000` (dev) or `https://yourdomain.com` (prod)
- Supabase will automatically handle OAuth callbacks to `/auth/v1/callback`

### Step 4: Update Environment Variables

In `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

(The Google Client ID is optional - Supabase handles it server-side)

### Step 5: Test Google OAuth

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000`

3. Click "Checkout"

4. Click "Continue with Google" button

5. You should see:
   - Google login popup
   - Grant permissions prompt
   - Redirect to `/guest-auth/callback`
   - Auto-redirect to checkout with session set

## How Google OAuth Works

### Flow Diagram

```
User clicks "Continue with Google"
        ↓
guestAuth.signInWithGoogle()
        ↓
Supabase OAuth initiates
        ↓
Redirect to Google login
        ↓
User logs in with Google
        ↓
Google redirects to callback
        ↓
Supabase validates token
        ↓
Redirect to /guest-auth/callback
        ↓
handleGoogleCallback() creates/gets guest user
        ↓
Session saved to localStorage
        ↓
Redirect to checkout
```

## Code Integration

### In guest-auth/page.tsx

The Google button is already integrated:

```typescript
const handleGoogleAuth = async () => {
  setError("");
  setGoogleLoading(true);

  try {
    await guestAuth.signInWithGoogle();
    // Supabase handles the redirect automatically
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google authentication failed";
    setError(message);
    setGoogleLoading(false);
  }
};
```

### In lib/guest-auth.ts

The service has two Google methods:

```typescript
// Initiate OAuth flow
async signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/guest-auth/callback`,
    },
  });
}

// Handle callback and create/get guest user
async handleGoogleCallback(): Promise<GuestUser | null> {
  // Gets Supabase auth session
  // Creates or retrieves guest user from guest_users table
  // Returns GuestUser object
}
```

### In guest-auth/callback/page.tsx

Handles the OAuth redirect:

```typescript
useEffect(() => {
  const handleCallback = async () => {
    // Process Google OAuth
    const guestUser = await guestAuth.handleGoogleCallback();
    guestAuth.setGuestSession(guestUser);
    router.push(returnUrl);
  };
}, []);
```

## Troubleshooting

### "Redirect URI mismatch"

**Problem:** Google OAuth fails with redirect URI error

**Solution:**
1. Check Google Cloud Console credentials
2. Verify authorized redirect URIs include `/auth/v1/callback`
3. Verify authorized origins include `localhost:3000` or your domain
4. Make sure Supabase Site URL matches (Settings → URL Configuration)

### Google button doesn't redirect

**Problem:** Clicking Google button does nothing

**Solution:**
1. Check browser console for errors
2. Verify Google Cloud OAuth is enabled
3. Verify Supabase Google provider is enabled
4. Check that `signInWithOAuth` is being called

### Callback page shows error

**Problem:** `/guest-auth/callback` shows "Failed to create account"

**Solution:**
1. Check that `guest_users` table exists with correct schema
2. Verify RLS policies allow INSERT on `guest_users`
3. Check browser console for Supabase errors
4. Ensure `handleGoogleCallback()` can query the database

### Session not saving after Google auth

**Problem:** Redirected to checkout but no guest session

**Solution:**
1. Check that `setGuestSession()` is being called
2. Verify localStorage is enabled in browser
3. Check browser DevTools → Application → LocalStorage for `guest_session` key
4. Verify callback page waits for `handleGuestUser()` to complete

## Security Notes

✅ **Supabase handles OAuth securely** - Never exposes tokens  
✅ **Credentials stored server-side** - Client never sees secrets  
✅ **HTTPS required in production** - OAuth only over HTTPS  
✅ **Scopes minimal** - Only requests necessary info  
✅ **Session in localStorage** - Standard for SPAs  

⚠️ **Production Checklist:**
- [ ] Update redirect URIs for production domain
- [ ] Change Site URL to production domain in Supabase
- [ ] Test full OAuth flow on production
- [ ] Monitor OAuth consent screen (appears once per account)
- [ ] Have Google support contact for verification if needed

## Testing Scenarios

### Test 1: New User via Google

```
1. Click "Continue with Google"
2. Log in with new Google account
3. Grant permissions
4. Should create new guest user
5. Redirect to checkout
6. Session should be saved
```

### Test 2: Existing User via Google

```
1. Sign up with Google
2. Log out (clear session)
3. Click "Continue with Google"
4. Log in with same Google account
5. Should retrieve existing guest user
6. Redirect to checkout
```

### Test 3: Email User Switching to Google

```
1. Sign up with email/password
2. Log out
3. Try "Continue with Google" with same email
4. Should retrieve existing guest user
5. Session updates to auth_method: "google"
6. No duplicate accounts created
```

### Test 4: Mobile Flow

```
1. On mobile, click "Continue with Google"
2. Google app (or browser) handles OAuth
3. Redirect back to app
4. Should work seamlessly
```

## Next Steps

- [ ] Get Google OAuth credentials from Google Cloud Console
- [ ] Enable Google provider in Supabase
- [ ] Update redirect URIs
- [ ] Test on localhost
- [ ] Configure production redirect URIs
- [ ] Deploy and test in production

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs
2. Check browser console: DevTools → Console
3. Check network tab: DevTools → Network (OAuth requests)
4. Verify Google Cloud Console settings are correct
5. Verify Supabase Google provider is fully configured

---

**Google OAuth Status:** ✅ Integrated with Supabase  
**Last Updated:** March 25, 2024  
**Version:** 1.0
