# Guest Authentication System - Complete Overview

## 🎯 What This Does

When a user clicks **"Checkout"** or **"Buy Now"** on the main app (`/`), they must authenticate. This is a **guest-only authentication system** that:

- ✅ Lets users sign up without creating a permanent account
- ✅ Lets returning users log in with email + phone
- ✅ Auto-fills checkout form with saved guest info
- ✅ Stores orders with guest email for tracking
- ✅ Uses localStorage for session persistence
- ✅ Provides option to clear saved details

Users can **browse and add to cart freely** without logging in. Authentication is only required at checkout.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main App (/)                         │
│                                                         │
│  User browses products → Adds to cart → Clicks Checkout│
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Guest Auth Modal     │
            │  (Signup/Login Form)   │
            └────────┬───────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌──────────┐        ┌──────────┐
    │  Signup  │        │  Login   │
    │ (New)    │        │ (Existing)│
    └────┬─────┘        └─────┬────┘
         │                    │
         └─────────┬──────────┘
                   ▼
        ┌──────────────────────┐
        │  Save to localStorage│
        │  (Session + Details) │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │  Redirect to Checkout│
        │  (Pre-fill form)     │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │  Complete Order      │
        │  (Payment + Save DB) │
        └──────────────────────┘
```

---

## 📦 Components

### 1. **lib/guest-auth.ts** (Service Layer)
Handles all guest authentication operations:

```typescript
// Create or update guest user
const user = await guestAuth.createGuestUser({
  email: "john@example.com",
  phone: "+234 800 000 0000",
  firstName: "John",
  lastName: "Doe"
});

// Verify guest exists (for login)
const isValid = await guestAuth.verifyGuestUser(email, phone);

// Get guest user details
const user = await guestAuth.getGuestUser(email);

// Session management
guestAuth.setGuestSession(user);        // Save to localStorage
const session = guestAuth.getGuestSession(); // Get from localStorage
guestAuth.clearGuestSession();           // Clear session
```

**Database:** Reads/writes to Supabase `guest_users` table

---

### 2. **app/components/GuestAuthModal.tsx** (UI Component)
Beautiful modal with two modes:

**Signup Mode:**
- Input: First Name, Last Name, Email, Phone
- Validation: Email format, phone length, unique email
- Action: Create new guest user
- Error: "Email already registered" → Switch to login

**Login Mode:**
- Input: Email, Phone
- Validation: Email/phone combination must exist
- Action: Retrieve existing guest user
- Error: "No account found" → Switch to signup

**Features:**
- Toggle between signup/login modes
- Loading states with spinner
- Error messages in red banner
- Helpful guest checkout info badge
- Disabled state while processing

---

### 3. **Updated Files**

#### **app/page.tsx** (Main App)
```typescript
// Add modal state
const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
const [guestUser, setGuestUser] = useState<GuestUser | null>(null);

// Load session on mount
useEffect(() => {
  const savedSession = guestAuth.getGuestSession();
  if (savedSession) setGuestUser(savedSession);
}, []);

// Check auth when clicking checkout
const handleCheckout = () => {
  if (!guestUser) {
    setIsAuthModalOpen(true);
    return;
  }
  window.location.href = '/checkout';
};

// Handle successful auth
const handleAuthSuccess = (user: GuestUser) => {
  setGuestUser(user);
  setIsAuthModalOpen(false);
  window.location.href = '/checkout';
};

// Render modal
<GuestAuthModal
  isOpen={isAuthModalOpen}
  onClose={() => setIsAuthModalOpen(false)}
  onSuccess={handleAuthSuccess}
  initialEmail={guestUser?.email}
/>
```

#### **app/checkout/page.tsx** (Checkout)
```typescript
// Load guest session on mount
useEffect(() => {
  const savedSession = guestAuth.getGuestSession();
  if (savedSession) {
    setGuestUser(savedSession);
    // Auto-fill form
    setCustomerInfo((prev) => ({
      ...prev,
      firstName: savedSession.firstName,
      lastName: savedSession.lastName,
      email: savedSession.email,
      phone: savedSession.phone,
    }));
  }
}, []);
```

---

## 📊 Database Schema

**Supabase Table: `guest_users`**

```sql
id              UUID      (primary key, auto-generated)
email           VARCHAR   (unique - no duplicate emails)
phone           VARCHAR   (for login verification)
first_name      VARCHAR   (saved from signup)
last_name       VARCHAR   (saved from signup)
created_at      TIMESTAMP (auto-set to now)
updated_at      TIMESTAMP (auto-updated on changes)
```

**Indexes:**
- `idx_guest_users_email` - Fast email lookup
- `idx_guest_users_email_phone` - Fast login verification (email + phone)

---

## 🔄 Data Flow

### Signup Flow
```
1. User clicks Checkout
   ↓
2. Modal opens (Signup tab selected)
   ↓
3. User enters: First Name, Last Name, Email, Phone
   ↓
4. Click "Create Account"
   ↓
5. Validate inputs (email format, required fields, phone length)
   ↓
6. Call guestAuth.createGuestUser()
   ├─ Check if email already exists
   ├─ If exists: Show error "Email already registered"
   └─ If not exists: Create new guest_users record
   ↓
7. Save session to localStorage
   ├─ Store: { user, createdAt }
   └─ Key: "guest_session"
   ↓
8. Close modal & redirect to /checkout
   ↓
9. Checkout page loads saved session
   ├─ Get from localStorage
   └─ Auto-fill form
```

### Login Flow
```
1. User clicks Checkout
   ↓
2. Modal opens (Login tab by default)
   ↓
3. User enters: Email, Phone
   ↓
4. Click "Log In"
   ↓
5. Call guestAuth.verifyGuestUser(email, phone)
   ├─ Query: SELECT FROM guest_users WHERE email = ? AND phone = ?
   ├─ If found: Continue
   └─ If not found: Show error "No account found"
   ↓
6. Call guestAuth.getGuestUser(email) to get full details
   ↓
7. Save session to localStorage
   ↓
8. Close modal & redirect to /checkout
```

---

## 💾 LocalStorage Data Structure

### Guest Session
**Key:** `guest_session`  
**Value:**
```json
{
  "user": {
    "id": "uuid-xxx",
    "email": "john@example.com",
    "phone": "+234 800 000 0000",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-03-25T10:30:00Z"
  },
  "createdAt": "2024-03-25T10:30:00Z"
}
```

### Checkout Details
**Key:** `checkout_details`  
**Value:**
```json
{
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+234 800 000 0000",
    "address": "123 Main St"
  },
  "selectedLGA": "Lagos Island",
  "paymentMethod": "card"
}
```

---

## 🔐 Security & Validation

### Email Validation
- Must be valid email format (RFC compliant)
- Must be unique in `guest_users` table
- Case-insensitive for duplicates

### Phone Validation
- Minimum 10 characters
- Stored as-is (can include + and spaces)
- Used as verification key for login

### Input Sanitization
- All inputs trimmed of whitespace
- Frontend validation before API call
- SQL injection prevention via Supabase

### Session Security
- Stored only in browser localStorage
- No sensitive data exposed
- Cleared on logout/browser close

---

## 🚀 Deployment Checklist

- [ ] Create `guest_users` table in Supabase
- [ ] Enable RLS policies for `guest_users`
- [ ] Test signup flow on localhost
- [ ] Test login flow on localhost
- [ ] Test email pre-fill on checkout page
- [ ] Test session persistence (reload page)
- [ ] Test "Clear saved details" button
- [ ] Deploy to production
- [ ] Test on live domain

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| Modal not opening | Missing import or state | Check page.tsx has `GuestAuthModal` import |
| "Email already registered" on signup | Email exists in DB | Try different email or switch to login |
| "No account found" on login | Email+phone not in DB | Check spelling and switch to signup |
| Form not pre-filling | Session not saved | Check localStorage in DevTools |
| Auth data persists after logout | Session not cleared | Ensure clearGuestSession() is called |

---

## 🎨 UI/UX Features

### Modal
- Clean, modern design with Tailwind CSS
- Centered, fixed overlay
- Responsive (works on mobile)
- Dark overlay behind modal for focus

### Form Elements
- Smooth input focus states (blue ring)
- Placeholder text for guidance
- Real-time error messages
- Loading spinner during submission
- Disabled state prevents double-submission

### Error Handling
- Red error banner at top of form
- Clear, user-friendly error messages
- Automatic tab switching for related errors

### User Feedback
- "Logging in..." and "Creating Account..." button states
- Info badge explaining guest checkout
- Toast-like error display

---

## 📈 Next Enhancements

### Phase 2 (Future)
- [ ] Email verification with OTP
- [ ] Password-protected accounts
- [ ] Order history for logged-in users
- [ ] Wishlist/saved items
- [ ] Loyalty program integration
- [ ] Account recovery/reset password
- [ ] Persistent cart across devices

### Phase 3 (Roadmap)
- [ ] Social login (Google, Facebook)
- [ ] Biometric authentication
- [ ] Two-factor authentication
- [ ] Account management dashboard

---

## 📚 Files & Locations

```
project/
├── lib/
│   └── guest-auth.ts                    # Auth service
├── app/
│   ├── components/
│   │   └── GuestAuthModal.tsx           # Modal component
│   ├── page.tsx                         # Main app (updated)
│   └── checkout/
│       └── page.tsx                     # Checkout (updated)
├── scripts/
│   └── create_guest_users_table.sql     # DB migration
├── GUEST_AUTH_SETUP.md                  # Detailed setup guide
├── GUEST_AUTH_IMPLEMENTATION.md         # Implementation notes
└── setup-guest-auth.sh                  # Quick setup script
```

---

## 🆘 Support & Troubleshooting

See **GUEST_AUTH_SETUP.md** for:
- Step-by-step database setup
- RLS policy configuration
- API reference with examples
- Detailed troubleshooting guide
- Testing procedures

---

**Status:** ✅ Complete and Ready for Setup  
**Last Updated:** March 25, 2024  
**Version:** 1.0
