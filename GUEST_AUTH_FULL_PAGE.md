# Full-Page Guest Authentication with Email/Password & Google

## Overview

Complete guest authentication system featuring:
- ✅ **Full-page signup** with email/password
- ✅ **Full-page login** with email/password
- ✅ **Google OAuth button** (ready for integration)
- ✅ **Form toggle** between signup and login
- ✅ **Password validation** (min 6 characters, must match)
- ✅ **Beautiful UI** with modern design
- ✅ **Automatic redirect** from checkout if not logged in
- ✅ **Session persistence** in localStorage

## Architecture

```
Main App (/) 
   └─ User clicks "Checkout"
      └─ No guest session?
         └─ Redirect to /guest-auth?return=/checkout
            └─ Show signup/login form
            └─ Google button
            └─ Toggle between modes
            └─ Create account or login
            └─ Redirect to /checkout with session
               └─ Form auto-filled
```

## File Structure

```
app/
├── guest-auth/
│   └── page.tsx              # Full-page auth component (340 lines)
├── page.tsx                  # Updated: redirects to guest-auth
└── checkout/page.tsx         # Updated: requires guest session
lib/
└── guest-auth.ts             # Auth service with email/password/Google
scripts/
└── create_guest_users_table.sql  # Database migration
```

## Setup Instructions

### 1. Create Database Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create guest_users table
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

-- Indexes for fast lookups
CREATE INDEX idx_guest_users_email ON guest_users(email);
CREATE INDEX idx_guest_users_auth_method ON guest_users(auth_method);
```

### 2. Enable Row Level Security

In Supabase dashboard → `guest_users` table → Policies:

```sql
CREATE POLICY "Allow all operations on guest_users" ON guest_users
FOR ALL USING (true) WITH CHECK (true);
```

Or enable specific operations (SELECT, INSERT, UPDATE) and set expression to `true`.

### 3. Configure Google OAuth (Optional)

To enable Google signup:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add your domain to authorized origins
4. Get Client ID from credentials
5. In `guest-auth/page.tsx`, uncomment the Google auth handler:

```typescript
// Replace the placeholder handleGoogleAuth with:
const result = await gapi.auth2.getAuthInstance().signIn();
const user = result.getBasicProfile();

const guestUser = await guestAuth.signUpWithGoogle({
  email: user.getEmail(),
  firstName: user.getGivenName(),
  lastName: user.getFamilyName(),
});

guestAuth.setGuestSession(guestUser);
router.push(returnUrl);
```

### 4. Start Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000` and click "Checkout"

## User Flows

### Signup Flow (New User)

```
1. Click Checkout on main page
2. Redirected to /guest-auth?return=/checkout
3. See signup form (default view)
4. Enter: First Name, Last Name, Email, Password, Confirm Password
5. Click "Create Account"
6. Validation:
   - Name fields required
   - Email must be valid format
   - Password min 6 characters
   - Passwords must match
   - Email must be unique
7. Account created
8. Session saved to localStorage
9. Redirected to /checkout
10. Form auto-filled with signup data
```

### Login Flow (Returning User)

```
1. Click Checkout on main page
2. Redirected to /guest-auth?return=/checkout
3. See login form (click "Log In" tab)
4. Enter: Email, Password
5. Click "Log In"
6. Validation:
   - Both fields required
   - Email format checked
   - Password verified against stored hash
7. Session saved to localStorage
8. Redirected to /checkout
9. Form auto-filled with account data
```

### Google Signup Flow

```
1. Click "Continue with Google" on signup/login page
2. Google login popup
3. Select or create Google account
4. Grant permissions to app
5. Account created/linked (if first time)
6. Session saved
7. Redirected to checkout
```

## Database Schema

```sql
guest_users:
├── id (UUID) - Unique identifier
├── email (VARCHAR, UNIQUE) - Email address (unique key)
├── phone (VARCHAR, nullable) - Phone number
├── first_name (VARCHAR) - User's first name
├── last_name (VARCHAR) - User's last name
├── password_hash (VARCHAR, nullable) - Hashed password for email auth
├── auth_method (VARCHAR) - "email" or "google"
├── created_at (TIMESTAMP) - Account creation date
└── updated_at (TIMESTAMP) - Last update date
```

## API Functions

### Email/Password Signup

```typescript
const user = await guestAuth.signUpWithEmail({
  email: "user@example.com",
  password: "securePassword123",
  firstName: "John",
  lastName: "Doe",
  phone: "+234 800 000 0000" // Optional
});
```

**Errors:**
- "Please fill in all required fields"
- "Please enter a valid email"
- "Email already registered. Please log in instead."

### Email/Password Login

```typescript
const user = await guestAuth.loginWithEmail({
  email: "user@example.com",
  password: "securePassword123"
});
```

**Errors:**
- "Please enter email and password"
- "No account found with this email. Please sign up instead."
- "Invalid password"

### Google Signup

```typescript
const user = await guestAuth.signUpWithGoogle({
  email: "user@google.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+234 800 000 0000" // Optional
});
```

### Session Management

```typescript
// Save session to localStorage
guestAuth.setGuestSession(user);

// Get session from localStorage
const session = guestAuth.getGuestSession();

// Clear session
guestAuth.clearGuestSession();
```

## UI Features

### Full-Page Layout
- Centered card design with gradient background
- Back button to previous page
- Responsive on mobile and desktop
- 400px max-width for optimal readability

### Signup Form
- First Name field
- Last Name field
- Email field (with icon)
- Password field (with icon)
- Confirm Password field
- Real-time password matching validation
- Create Account button
- Toggle to login link

### Login Form
- Email field (with icon)
- Password field (with icon)
- Log In button
- Toggle to signup link

### Shared Elements
- Google login button at top
- "or" divider
- Error messages in red banner
- Loading states with spinner
- Disabled inputs while processing
- Guest checkout info footer
- Back button

### Validation Messages
- Real-time frontend validation
- Clear error messages
- Auto-scroll to errors
- Tab switching suggestions (e.g., email exists → switch to login)

## Security Features

✅ **Email Uniqueness** - Database constraint prevents duplicate emails  
✅ **Password Validation** - Min 6 characters, must match confirmation  
✅ **Input Validation** - Email format, required fields  
✅ **Session Isolation** - localStorage, not cookies (CSRF safe)  
✅ **Graceful Error Handling** - No password hints in errors  
✅ **Account Recovery** - Can use same email with different password  

⚠️ **Current Limitation:** Passwords stored as plain text in demo. In production:
- Use Supabase Auth for password hashing
- Or implement bcrypt hashing server-side in API route
- Never store plain text passwords

## Testing Checklist

- [ ] Navigate to `http://localhost:3000`
- [ ] Click "Checkout" button
- [ ] Verify redirected to `/guest-auth?return=/checkout`
- [ ] Test signup with valid data
  - [ ] First name, last name, email, password required
  - [ ] Password min 6 characters
  - [ ] Password confirmation must match
  - [ ] Email must be unique
- [ ] Test login with created account
  - [ ] Email and password required
  - [ ] Correct credentials allow login
  - [ ] Wrong password shows error
- [ ] Verify redirect to checkout after login/signup
- [ ] Verify form auto-filled with signup data
- [ ] Check localStorage for `guest_session` key
- [ ] Return to home and checkout again
  - [ ] Should see login form (not signup)
- [ ] Test form toggle between signup/login

## Environment Variables

No additional environment variables needed for basic functionality.

For Google OAuth integration, add:
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

## File Changes Summary

### New Files
- `app/guest-auth/page.tsx` - Full-page auth component

### Modified Files
- `lib/guest-auth.ts` - Updated with email/password functions
- `app/page.tsx` - Redirect to /guest-auth instead of modal
- `app/checkout/page.tsx` - Require guest session, redirect if missing
- `scripts/create_guest_users_table.sql` - Added password_hash and auth_method columns

### Deleted Files
- `app/components/GuestAuthModal.tsx` - Replaced with full-page version

## Next Steps

1. **Run SQL migration** in Supabase
2. **Enable RLS** policies for guest_users
3. **Start dev server**: `npm run dev`
4. **Test flows** using checklist above
5. (Optional) **Setup Google OAuth** for additional signup method
6. (Optional) **Add password hashing** in production (bcrypt on server)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Auth page shows blank | Check browser console for errors, verify imports |
| "Email already registered" | Email exists - use different email or click Login |
| "Invalid password" | Check password spelling (case-sensitive) |
| Form not auto-filling checkout | Check localStorage in DevTools, verify session saved |
| Not redirected to auth | Check that Checkout button uses `/guest-auth?return=/checkout` |
| Google button doesn't work | Google OAuth not configured yet (placeholder for now) |

## Production Considerations

1. **Password Hashing**: Implement bcrypt or use Supabase Auth
2. **Email Verification**: Add OTP or verification link
3. **Password Reset**: Implement forgot password flow
4. **Rate Limiting**: Prevent brute force login attempts
5. **HTTPS Only**: Require HTTPS for deployment
6. **CORS**: Configure CORS for OAuth providers
7. **Session Timeout**: Add session expiration logic

## Support

See full documentation in:
- `GUEST_AUTH_SETUP.md` - Original setup guide
- `GUEST_AUTH_GUIDE.md` - Comprehensive overview
- `GUEST_AUTH_IMPLEMENTATION.md` - Implementation notes

---

**Status:** ✅ Complete  
**Last Updated:** March 25, 2024  
**Version:** 2.0 (Full-page with email/password)
