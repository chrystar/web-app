# Guest Authentication Setup

## Overview
Guest authentication system for the main app. Users must authenticate (sign up or log in) only when they click "Checkout" or "Buy Now", not for browsing. This provides a frictionless shopping experience while maintaining order tracking.

## Setup Steps

### 1. Create the `guest_users` Table in Supabase

Run the following SQL in your Supabase SQL editor (go to SQL Editor in Supabase dashboard):

```sql
-- Create guest_users table for storing guest customer information
CREATE TABLE IF NOT EXISTS guest_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_guest_users_email ON guest_users(email);

-- Create index for email+phone lookup (for verification)
CREATE INDEX IF NOT EXISTS idx_guest_users_email_phone ON guest_users(email, phone);
```

### 2. Update Row Level Security (RLS) Policies

In Supabase, go to **Authentication > Policies** for the `guest_users` table and add:

**Enable all operations:**
```sql
CREATE POLICY "Allow all operations on guest_users" ON guest_users
FOR ALL USING (true) WITH CHECK (true);
```

Or set specific policies:
- **SELECT**: Allow all (for verification)
- **INSERT**: Allow all (for signup)
- **UPDATE**: Allow all (for updating existing guest info)

## How It Works

### 1. **Browse (No Auth Required)**
- User browses products freely
- Can add items to cart (stored in localStorage)

### 2. **Click Checkout/Buy Now**
- Modal opens showing guest auth form
- Options to **Sign Up** (new guest) or **Log In** (existing guest)
- Validation:
  - Sign Up: Email must be unique, requires first name, last name, email, phone
  - Log In: Must match existing email + phone combination

### 3. **Successful Auth**
- Guest session saved to localStorage
- User redirected to checkout page
- Form pre-filled with guest info
- User can add delivery address and select LGA

### 4. **Payment & Order**
- Guest email used for order tracking
- Paystack payment reference linked to order
- Order saved to `orders` and `order_items` tables

### 5. **Return Visit**
- If guest user logs out, next checkout requires re-authentication
- If guest session is active, checkout page auto-fills user info
- Guest can clear saved details for privacy

## File Structure

```
lib/
  guest-auth.ts              # Core guest auth functions
app/
  components/
    GuestAuthModal.tsx       # Login/Signup modal component
  page.tsx                   # Updated with auth modal integration
  checkout/
    page.tsx                 # Updated to load guest session
```

## API Functions

### `guestAuth.createGuestUser()`
```typescript
const user = await guestAuth.createGuestUser({
  email: "user@example.com",
  phone: "+234 800 000 0000",
  firstName: "John",
  lastName: "Doe"
});
```
- Creates new guest user or updates existing one
- Returns `GuestUser` object

### `guestAuth.getGuestUser()`
```typescript
const user = await guestAuth.getGuestUser("user@example.com");
```
- Retrieves guest user by email
- Returns `GuestUser | null`

### `guestAuth.verifyGuestUser()`
```typescript
const isValid = await guestAuth.verifyGuestUser(email, phone);
```
- Checks if guest user exists with matching email AND phone
- Used for login verification
- Returns `boolean`

### Session Management
```typescript
// Store session in localStorage
guestAuth.setGuestSession(user);

// Get session from localStorage
const session = guestAuth.getGuestSession();

// Clear session
guestAuth.clearGuestSession();
```

## Database Schema

```sql
guest_users:
├── id (UUID) - Primary key
├── email (VARCHAR) - Unique email address
├── phone (VARCHAR) - Phone number
├── first_name (VARCHAR) - First name
├── last_name (VARCHAR) - Last name
├── created_at (TIMESTAMP) - Account creation date
└── updated_at (TIMESTAMP) - Last update date
```

## Integration Examples

### In Home Page (Main App)
```tsx
import GuestAuthModal from "./components/GuestAuthModal";
import { guestAuth, type GuestUser } from "@/lib/guest-auth";

// Modal state
const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
const [guestUser, setGuestUser] = useState<GuestUser | null>(null);

// Load session on mount
useEffect(() => {
  const savedSession = guestAuth.getGuestSession();
  if (savedSession) setGuestUser(savedSession);
}, []);

// Checkout with auth check
const handleCheckout = () => {
  if (!guestUser) {
    setIsAuthModalOpen(true);
    return;
  }
  window.location.href = '/checkout';
};

// Success handler
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

### In Checkout Page
```tsx
import { guestAuth } from "@/lib/guest-auth";

// Load guest user session
useEffect(() => {
  const savedSession = guestAuth.getGuestSession();
  if (savedSession) {
    setGuestUser(savedSession);
    // Pre-fill form
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

## Features

✅ Guest users can sign up without creating a permanent account  
✅ Email verification through phone number matching (for login)  
✅ Session persistence in localStorage  
✅ Pre-filled checkout form for returning guests  
✅ Clear saved session option for shared device scenarios  
✅ Automatic session management  
✅ Error handling for duplicate emails  

## Error Handling

**Signup Errors:**
- "Please fill in all fields" - Required field missing
- "Please enter a valid email" - Invalid email format
- "Please enter a valid phone number" - Phone too short
- "This email is already registered. Please log in instead." - Email duplicate

**Login Errors:**
- "Please enter email and phone number" - Missing required fields
- "No account found with this email and phone. Please sign up instead." - No matching guest user

## Testing

1. Go to `localhost:3000`
2. Click "Checkout" button without logging in
3. Modal should open with signup/login form
4. Create a test account with email + phone + name
5. Should be redirected to checkout page
6. Form should be pre-filled with your info
7. Return to home and click checkout again
8. Should see login form this time
9. Log in with your test email + phone

## Next Steps

- [ ] Run the SQL migration in Supabase
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Verify order creation works with guest user email
- [ ] Test session persistence across page reloads
- [ ] Consider adding email verification (optional future enhancement)
