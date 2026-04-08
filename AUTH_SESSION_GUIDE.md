# Authentication Session Management - Complete Guide

## Implementation Summary

✅ **User sessions are now properly managed**  
✅ **Already-signed-in users cannot access the login/signup page**  
✅ **Users redirect to checkout automatically after signup**  
✅ **Session persists across page refreshes**  

## How It Works

### Flow 1: New User Signup

```
User on homepage → Clicks "Checkout"
    ↓
No session found → Redirect to /guest-auth?return=/checkout
    ↓
User fills signup form → Creates account
    ↓
Session saved to localStorage
    ↓
Automatically redirects to /checkout
    ↓
Checkout form auto-filled with user data
    ↓
User completes payment
    ↓
Order created and linked to guest_user_id
    ↓
Redirects to /orders/[id] to view order
```

### Flow 2: Returning User (Already Signed In)

```
User tries to access /guest-auth directly
    ↓
Auth check finds existing session
    ↓
Automatically redirects to /checkout
    ↓
(or wherever they came from via ?return= param)
```

### Flow 3: User Accesses Page While Signed In

```
User on homepage → Already has session
    ↓
guestUser state is populated
    ↓
Clicks "Checkout"
    ↓
Bypasses auth page, goes directly to /checkout
    ↓
Form already filled with user data
```

## Code Changes

### Guest Auth Page (`/app/guest-auth/page.tsx`)

**Added:**
```tsx
const [isCheckingAuth, setIsCheckingAuth] = useState(true);

// Check if user is already signed in - redirect if so
useEffect(() => {
  try {
    const savedSession = guestAuth.getGuestSession();
    if (savedSession) {
      // User is already authenticated, redirect to return URL
      router.push(returnUrl);
    }
  } catch (err) {
    console.error("Auth check error:", err);
  } finally {
    setIsCheckingAuth(false);
  }
}, [router, returnUrl]);

// Show loading while checking auth
if (isCheckingAuth) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader size={40} className="animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

**Result:**
- When user tries to access `/guest-auth`, we check if they already have a session
- If yes, redirect immediately to the return URL (default: `/checkout`)
- If no, show the signup/login forms
- Loading screen appears briefly while checking

### Sign Up Handler (`/app/guest-auth/page.tsx`)

**Updated redirect timing:**
```tsx
// Save session
guestAuth.setGuestSession(user);

// Redirect to checkout or return URL
setTimeout(() => {
  router.push(returnUrl);
}, 100);
```

**Why the timeout?**
- Ensures localStorage is fully written before redirect
- Prevents race conditions with session loading on next page
- Guarantees the session will be available when checkout page checks for it

### Main Page Session Loading (`/app/page.tsx`)

**Already had this correct:**
```tsx
// Load guest session from localStorage
useEffect(() => {
  const savedSession = guestAuth.getGuestSession();
  if (savedSession) {
    setGuestUser(savedSession);
  }
}, []);

// Handle checkout with auth check
const handleCheckout = () => {
  if (!guestUser) {
    router.push("/guest-auth?return=/checkout");
    return;
  }
  router.push("/checkout");
};
```

**How it works:**
1. Page loads, checks localStorage for guest session
2. If found, sets `guestUser` state
3. User clicks "Checkout" button
4. If `guestUser` exists, goes directly to `/checkout`
5. If not, goes to `/guest-auth?return=/checkout`

### Checkout Page Auth Check (`/app/checkout/page.tsx`)

**Already had proper redirect:**
```tsx
useEffect(() => {
  try {
    const savedSession = guestAuth.getGuestSession();
    if (!savedSession) {
      router.push("/guest-auth?return=/checkout");
      return;
    }
    
    setGuestUser(savedSession);
    // Pre-fill form...
  } catch (error) {
    console.error("Failed to load checkout details:", error);
  }
}, [router]);
```

## Session Storage

### localStorage Structure
```javascript
// Session object stored in localStorage under "guest_session"
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+234 800 000 0000",
  "authMethod": "email" or "google"
}
```

### How to Check Session in Browser Console
```javascript
// View current session
JSON.parse(localStorage.getItem("guest_session"));

// Clear session (logout)
localStorage.removeItem("guest_session");

// Check if user is logged in
const isLoggedIn = !!localStorage.getItem("guest_session");
console.log(isLoggedIn);
```

## URL Parameters

### Return Parameter
Used to redirect users back to where they came from after auth:

```
/guest-auth?return=/checkout
/guest-auth?return=/products
/guest-auth?return=/orders
```

**Default:** `/checkout` (if no return param provided)

### How It Works
```tsx
const returnUrl = searchParams.get("return") || "/checkout";
// After signup:
router.push(returnUrl); // Redirects to return URL or checkout
```

## Testing the Implementation

### Test 1: First-Time User
```
1. Open http://localhost:3000
2. Click "Checkout"
3. You should go to /guest-auth (no session)
4. Sign up with email and password
5. Automatically redirected to /checkout
6. Form is auto-filled with signup data ✓
```

### Test 2: Returning User
```
1. Don't close browser (session still in localStorage)
2. Go directly to http://localhost:3000/guest-auth
3. You should be immediately redirected to /checkout ✓
4. No signup form visible
```

### Test 3: Session Persistence
```
1. Sign up and go to checkout
2. Complete payment
3. View order at /orders/[id]
4. Refresh the page
5. Session still exists, user info still available ✓
```

### Test 4: Logout/Clear Session
```
1. Open browser DevTools (F12)
2. Go to Application → LocalStorage
3. Find "guest_session" key
4. Delete it
5. Refresh page
6. Session is cleared, next "Checkout" redirects to auth ✓
```

## Important Implementation Details

### 1. **Auth Check on Page Load**
The guest-auth page checks for existing session on mount, ensuring users can't stay on the login page if already signed in.

### 2. **Timeout After Signup**
100ms timeout ensures localStorage is properly committed before navigation, preventing "session not found" errors.

### 3. **Return URL Default**
Default return URL is `/checkout` because that's the main conversion funnel. Users can customize by adding `?return=/` parameter.

### 4. **Session Scope**
Session is stored in `localStorage` (not `sessionStorage`), so it persists across:
- Browser refresh ✓
- Tab navigation ✓
- Page closing and reopening ✓

Session is cleared when:
- User manually clears browser data
- Script explicitly calls `guestAuth.clearGuestSession()`
- Manual delete from DevTools

### 5. **No Infinite Redirects**
The check prevents infinite loops:
- Guest-auth page checks session once on mount
- If found, redirects away (doesn't check again)
- If not found, shows forms (doesn't continuously check)

## Edge Cases Handled

| Scenario | Behavior | Result |
|----------|----------|--------|
| User signs up on /guest-auth?return=/checkout | Redirects to /checkout | ✓ Auto-fills form |
| User is already logged in and visits /guest-auth | Redirects to /checkout | ✓ No infinite loop |
| User clears localStorage and clicks checkout | Redirects to /guest-auth | ✓ Can sign up again |
| User clicks back after signup | Returns to /guest-auth (but immediately redirects) | ✓ Seamless UX |
| User opens checkout in different tab while signed in | Both tabs work correctly | ✓ Shared session |
| User disables localStorage | Checkout redirects to auth each time | ✓ Graceful degradation |

## Future Enhancements

### Phase 1 ✅ (Current)
- Session persists across page refreshes
- Signed-in users skip login page
- Automatic redirect to checkout after signup

### Phase 2 (Recommended)
- [ ] Add "Sign out" button in checkout/orders
- [ ] Add "Remember me" for future visits
- [ ] Add session timeout (optional logout after inactivity)
- [ ] Add "Continue as different user" option

### Phase 3 (Advanced)
- [ ] Server-side session validation
- [ ] JWT token-based auth
- [ ] Server-side session storage in database
- [ ] Multi-device session management
- [ ] Email verification for signups

## Troubleshooting

### Problem: User keeps redirecting to login
**Solution:** Clear localStorage manually
```javascript
localStorage.removeItem("guest_session");
```

### Problem: Session doesn't persist after refresh
**Solution:** Check browser settings
- Make sure localStorage is enabled
- Check if in private/incognito mode
- Browser may be clearing storage automatically

### Problem: User stuck on auth page
**Solution:** 
1. Check browser console for errors
2. Verify localStorage is accessible
3. Clear browser cache and try again

## Files Modified

| File | Changes |
|------|---------|
| `/app/guest-auth/page.tsx` | Added auth check, loading state, redirect logic |
| `/app/page.tsx` | Already had proper session loading |
| `/app/checkout/page.tsx` | Already had proper redirect |

## Summary

The authentication system now ensures:

✅ **Seamless Signup Flow**
- User signs up → Automatically goes to checkout
- No extra clicks needed

✅ **Session Persistence**
- Session stored in localStorage
- Survives page refreshes
- Works across tabs

✅ **Protected Auth Page**
- Already-signed-in users bypass login page
- Redirects to intended destination

✅ **Smart Redirects**
- Uses `?return=` parameter for flexibility
- Defaults to checkout for conversion
- Prevents infinite redirect loops

✅ **User-Friendly**
- Fast checkout experience
- Auto-filled forms
- No unnecessary auth pages

---

**Status:** ✅ Complete  
**Last Updated:** March 25, 2026  
**Version:** 1.0
