# Proper Order Handling Implementation - Complete Guide

## What's Implemented

✅ **Guest User Linking** - Orders linked to guest_users via guest_user_id  
✅ **Order Status Tracking** - Pending → Confirmed → Processing → Shipped → Delivered  
✅ **Order Retrieval API** - Get orders by ID, email, or payment reference  
✅ **Order Tracking Page** - Beautiful page showing full order details  
✅ **Order Items with Details** - Track each product in order  
✅ **Payment Information** - Reference and method stored with order  
✅ **Delivery Information** - Address, LGA, contact details  
✅ **Admin Notes** - Add notes for delivery instructions  
✅ **Email & Phone Lookup** - Find orders by customer email  

## Database Changes

### New Columns for `orders` table

Run this SQL in Supabase:

```sql
-- Add guest_user_id column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_user_id UUID REFERENCES guest_users(id) ON DELETE SET NULL;

-- Add order status enum-like column for better tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'pending';

-- Add notes column for admin/delivery notes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
```

### Schema Overview

```sql
orders:
├── id (UUID) - Primary key
├── guest_user_id (UUID, FK) - Link to guest_users table
├── customer_name (VARCHAR) - Customer full name
├── customer_email (VARCHAR) - Email address
├── customer_phone (VARCHAR) - Phone number
├── delivery_address (VARCHAR) - Delivery address
├── delivery_lga (VARCHAR) - Local government area
├── payment_method (VARCHAR) - "card" or other methods
├── payment_reference (VARCHAR) - Paystack reference
├── subtotal (NUMERIC) - Order subtotal
├── delivery_fee (NUMERIC) - Delivery charge
├── total (NUMERIC) - Total amount
├── status (VARCHAR) - Deprecated, use order_status
├── order_status (VARCHAR) - Current status (pending, confirmed, processing, shipped, delivered, completed)
├── notes (TEXT) - Admin/delivery notes
├── created_at (TIMESTAMP) - Order creation date
└── updated_at (TIMESTAMP) - Last update date

order_items:
├── id (UUID) - Primary key
├── order_id (UUID, FK) - Link to orders
├── product_id (INTEGER) - Product ID
├── product_name (VARCHAR) - Product name at time of order
├── product_price (NUMERIC) - Price at time of order
├── quantity (INTEGER) - Quantity ordered
└── subtotal (NUMERIC) - Item subtotal
```

## API Endpoints

### POST /api/orders - Create Order

**Request:**
```json
{
  "guestUserId": "uuid-or-null",
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+234 800 000 0000",
    "address": "123 Main Street"
  },
  "selectedLGA": "Lagos Island",
  "paymentMethod": "card",
  "paymentReference": "paystack-ref-123",
  "items": [
    {
      "id": 1,
      "name": "Frozen Chicken (1kg)",
      "price": 5000,
      "quantity": 2
    }
  ],
  "subtotal": 10000,
  "deliveryFee": 1500,
  "total": 11500
}
```

**Response:**
```json
{
  "id": "order-uuid",
  "message": "Order created successfully"
}
```

### GET /api/orders - Retrieve Orders

**By Order ID:**
```
GET /api/orders?id=order-uuid
```

**By Customer Email:**
```
GET /api/orders?email=john@example.com
```

**By Payment Reference:**
```
GET /api/orders?reference=paystack-ref-123
```

**Response:**
```json
{
  "id": "order-uuid",
  "guest_user_id": "guest-uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+234 800 000 0000",
  "delivery_address": "123 Main Street",
  "delivery_lga": "Lagos Island",
  "payment_method": "card",
  "payment_reference": "paystack-ref-123",
  "subtotal": 10000,
  "delivery_fee": 1500,
  "total": 11500,
  "status": "confirmed",
  "order_status": "confirmed",
  "created_at": "2024-03-25T10:00:00Z",
  "updated_at": "2024-03-25T10:00:00Z",
  "notes": null,
  "order_items": [
    {
      "id": "item-uuid",
      "product_id": 1,
      "product_name": "Frozen Chicken (1kg)",
      "product_price": 5000,
      "quantity": 2,
      "subtotal": 10000
    }
  ]
}
```

## Frontend Flow

### Checkout Page → Order Creation

1. **User fills checkout form**
   - Pre-filled with guest_user info (firstName, lastName, email, phone)
   - Enters delivery address
   - Selects LGA
   - Chooses payment method

2. **Paystack payment opens**
   - User completes payment
   - Paystack returns payment reference

3. **Order API called with:**
   - guestUserId (from guest session)
   - Customer details
   - Cart items
   - Payment reference

4. **Order created in DB**
   - Link to guest_users table
   - Set status to "confirmed"
   - Create order items records

5. **Redirect to order page**
   - `/orders/[order-id]`
   - Shows complete order details
   - Shows delivery tracking
   - Shows payment confirmation

### Order Tracking Page (`/orders/[id]`)

Features:
- Order confirmation status with visual timeline
- Delivery details (recipient, address, LGA, contact)
- Payment details (method, reference, amount breakdown)
- Order items list with prices and quantities
- Admin notes (if added)
- Support contact information (phone/email)
- Loading and error states

## Guest User Integration

### When User Signs Up/Logs In

1. Guest user created/retrieved
2. Session stored in localStorage
3. Guest info auto-filled in checkout:
   - firstName ✓
   - lastName ✓
   - email ✓
   - phone ✓

### When Order Created

1. guestUserId from session sent with order
2. Order linked to guest_users table
3. Customer can look up order later by:
   - Email address
   - Order ID
   - Payment reference

### Order History (Future Enhancement)

```typescript
// Get all orders for a guest user
const response = await fetch(`/api/orders?email=john@example.com`);
const orders = await response.json(); // Array of orders
```

## Order Status Lifecycle

```
pending (Initial)
   ↓
confirmed (Payment verified, order created)
   ↓
processing (Admin preparing order)
   ↓
shipped (Order sent to delivery)
   ↓
delivered (Order reached destination)
   ↓
completed (Customer confirmed receipt)
```

Update status via admin panel (future enhancement):
```typescript
// Update order status (admin only)
await supabase
  .from('orders')
  .update({ order_status: 'shipped' })
  .eq('id', orderId);
```

## Error Handling

### Order Creation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Payment verification failed | Paystack payment not valid | Check payment reference with Paystack |
| Failed to create order | DB insert error | Check database connection |
| Failed to create order items | Missing products | Verify cart items exist in products table |
| Request timeout | API taking too long | Retry or contact support |

### Order Retrieval Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Order not found | Invalid order ID | Check order ID format |
| Failed to fetch orders | DB query error | Verify email format |

## Testing Flow

### 1. Create Account
```
1. Go to localhost:3000
2. Click Checkout
3. Sign up with:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: test123
```

### 2. Fill Checkout
```
1. Go to checkout (redirected automatically)
2. Form auto-filled with signup data
3. Add delivery address: "123 Test Street"
4. Select LGA: "Lagos Island"
5. Choose payment method: "card"
```

### 3. Complete Payment
```
1. Click "Place Order"
2. Paystack popup opens
3. Use test card: 4111 1111 1111 1111
4. Expire: 01/25
5. CVV: 123
6. Pay
```

### 4. View Order
```
1. Redirected to /orders/[order-id]
2. See order confirmation
3. Check delivery details
4. Review payment info
5. View order items
```

### 5. Retrieve Order by Email
```bash
curl "http://localhost:3000/api/orders?email=test@example.com"
```

Returns all orders for that email.

## Integration Points

### Checkout Page
- Imports `guestAuth` to get `guestUser?.id`
- Sends `guestUserId` with order creation request
- Redirects to `/orders/[id]` on success

### Order Page
- Fetches order from `/api/orders?id=...`
- Displays order details beautifully
- Shows order status with timeline
- Provides support contact information

### Order API
- Uses Supabase service role key (not anon key)
- Verifies payment with Paystack
- Links order to guest_user_id
- Creates order and order_items records
- Retrieves orders by multiple filters

## Future Enhancements

### Phase 1 (Current)
✅ Create orders linked to guest users
✅ Retrieve orders by ID, email, or reference
✅ Beautiful order tracking page
✅ Order status tracking

### Phase 2 (Next)
- [ ] Admin panel to update order status
- [ ] Email notifications on status changes
- [ ] SMS delivery notifications
- [ ] Order history page per guest user
- [ ] Estimated delivery date calculation
- [ ] Delivery tracking with map

### Phase 3 (Later)
- [ ] Refund/cancel order functionality
- [ ] Return request system
- [ ] Invoice generation/download
- [ ] WhatsApp order updates
- [ ] Integration with logistics provider
- [ ] Barcode/QR code tracking

## Important Notes

1. **Service Role Key**: Orders API uses `SUPABASE_SERVICE_ROLE_KEY` to write to database (bypasses RLS)
2. **Payment Verification**: Paystack verification required before order creation (with dev mode bypass)
3. **Order Items**: Stores product details at time of order (for historical accuracy)
4. **Guest User Link**: Optional (null if guest not logged in) - but recommended
5. **Email Lookup**: Useful for guest order tracking without login

## Files Changed

**New:**
- `scripts/update_orders_schema.sql` - Database migration
- Updated `app/orders/[id]/page.tsx` - Order tracking page (complete rewrite)

**Modified:**
- `app/api/orders/route.ts` - Added guest_user_id, GET endpoint
- `app/checkout/page.tsx` - Send guestUserId with order

## Deployment Checklist

- [ ] Run SQL migration in Supabase
- [ ] Test order creation with guest user
- [ ] Test order retrieval by ID
- [ ] Test order retrieval by email
- [ ] Test order page display
- [ ] Test with payment flow
- [ ] Verify order_items created correctly
- [ ] Check database indexes created

---

**Status:** ✅ Complete  
**Last Updated:** March 25, 2024  
**Version:** 1.0
