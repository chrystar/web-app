# Admin Backend - Authentication System

## Overview
Complete authentication system for the Frost Chicken admin panel using Supabase + Next.js.

## Architecture

### Files Created/Modified

1. **`lib/auth.ts`** - Core authentication utilities
   - `signUp()` - Register new admin user
   - `signIn()` - Sign in with email/password
   - `signOut()` - Logout
   - `getUser()` - Get current user
   - `getSession()` - Get current session
   - `resetPassword()` - Request password reset
   - `updatePassword()` - Change password
   - `onAuthStateChange()` - Listen to auth changes

2. **`app/providers.tsx`** - React Context for auth state management
   - `AuthProvider` - Wraps app to provide auth context
   - `useAuth()` - Hook to access auth state and functions
   - Manages user, loading, and error states
   - Auto-initializes auth on mount

3. **`app/protected-route.tsx`** - Route protection middleware
   - Redirects unauthenticated users to login
   - Redirects authenticated users away from login page
   - Shows loading state while checking auth
   - Public routes: `/admin/login`, `/admin/reset-password`

4. **`app/layout.tsx`** - Updated root layout
   - Wraps app with `AuthProvider`
   - Wraps app with `ProtectedRoute`
   - Enables auth across entire app

5. **`app/admin/layout.tsx`** - Updated admin layout
   - Uses `useAuth()` hook to access user and signOut
   - Shows user email in sidebar
   - Proper logout functionality
   - Dynamic welcome message

6. **`app/admin/login/page.tsx`** - Updated login page
   - Uses `useAuth()` hook for signin
   - Better error handling
   - Uses auth context instead of direct Supabase calls

## Usage

### In Components

```tsx
import { useAuth } from "@/app/providers";

export default function MyComponent() {
  const { user, isAuthenticated, loading, signIn, signOut, error } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <p>Logged in as: {user?.email}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Sign In

```tsx
const { signIn } = useAuth();

try {
  await signIn(email, password);
  // User is now authenticated
  router.push("/admin/dashboard");
} catch (error) {
  console.error("Login failed:", error);
}
```

### Sign Out

```tsx
const { signOut } = useAuth();

await signOut();
router.push("/admin/login");
```

## Features

✅ **Session Management** - Automatic session initialization and monitoring
✅ **Protected Routes** - Automatic redirection based on auth state
✅ **Loading States** - Proper loading UI while checking authentication
✅ **Error Handling** - Centralized error state management
✅ **User Info** - Access to current user email and metadata
✅ **Auto-redirect** - Users redirected after login/logout
✅ **Persistent Sessions** - Supabase handles session persistence

## Environment Setup

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000 (or your app URL)
```

## Next Steps

1. Test login with your Supabase admin user
2. Create admin user in Supabase if needed
3. Implement password reset flow
4. Add role-based access control (optional)
5. Implement session timeout (optional)
6. Add 2FA/MFA (optional)

## Testing

1. Navigate to `http://localhost:3001/admin/login`
2. Enter Supabase admin credentials
3. Should redirect to dashboard
4. Click logout to test signout
5. Should redirect back to login
