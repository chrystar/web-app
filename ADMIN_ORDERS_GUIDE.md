# Admin Orders Management - Complete Guide

## Overview

The admin orders management section provides a comprehensive dashboard for managing all customer orders, updating statuses, and adding delivery notes.

## Features Implemented

### 1. **Orders Dashboard**
- **Stats Cards**: Quick overview of order counts by status
  - Total Orders
  - Pending Orders
  - Processing Orders
  - Shipped Orders
  - Delivered Orders

### 2. **Search & Filter**
- Search by order ID, customer name, or email
- Filter by order status
- Real-time results

### 3. **Order List View**
- Expandable order cards
- Shows order ID, customer name, date, status, and total
- Color-coded status badges with icons
- Hover effects for better UX

### 4. **Detailed Order View**
When you click to expand an order, you can see:

#### Customer Information
- Full name
- Email address
- Phone number
- Order date

#### Delivery Information
- Delivery address
- Local Government Area (LGA)
- Payment method
- Payment reference

#### Status Management
- Dropdown to update order status
- Status options:
  - **pending**: Initial state when order is placed
  - **confirmed**: Order payment verified
  - **processing**: Order being prepared
  - **shipped**: Order sent to delivery
  - **delivered**: Order reached destination
  - **completed**: Customer confirmed receipt

#### Delivery Notes
- Textarea to add/edit delivery instructions
- Useful for special handling, customer notes, etc.
- Auto-saves when updated

#### Order Items
- Detailed table of all items in the order
- Product name at time of order
- Price, quantity, and subtotal
- Total order cost breakdown (subtotal + delivery fee)

## Database Schema

```sql
orders table:
├── id (UUID) - Order ID
├── guest_user_id (UUID, FK) - Link to guest user
├── customer_name (VARCHAR) - Full name
├── customer_email (VARCHAR) - Email
├── customer_phone (VARCHAR) - Phone
├── delivery_address (VARCHAR) - Address
├── delivery_lga (VARCHAR) - LGA
├── payment_method (VARCHAR) - Payment method
├── payment_reference (VARCHAR) - Paystack reference
├── subtotal (NUMERIC) - Subtotal
├── delivery_fee (NUMERIC) - Delivery fee
├── total (NUMERIC) - Total amount
├── order_status (VARCHAR) - Current status
├── notes (TEXT) - Delivery notes
├── created_at (TIMESTAMP) - Order date
└── updated_at (TIMESTAMP) - Last update

order_items table:
├── id (UUID)
├── order_id (UUID, FK)
├── product_id (INTEGER)
├── product_name (VARCHAR)
├── product_price (NUMERIC)
├── quantity (INTEGER)
└── subtotal (NUMERIC)
```

## API Endpoints

### GET /api/orders
Retrieve orders with optional filtering.

**Query Parameters:**
```
?id={orderId}           - Get single order by ID
?email={email}          - Get all orders by customer email
?reference={reference}  - Get order by payment reference
```

**Response:**
```json
{
  "id": "order-uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+234 800 000 0000",
  "delivery_address": "123 Main St",
  "delivery_lga": "Lagos Island",
  "payment_method": "card",
  "payment_reference": "ref-123",
  "subtotal": 50000,
  "delivery_fee": 2500,
  "total": 52500,
  "order_status": "confirmed",
  "notes": "Handle with care",
  "created_at": "2024-03-25T10:00:00Z",
  "order_items": [
    {
      "product_name": "Frozen Chicken",
      "product_price": 10000,
      "quantity": 2,
      "subtotal": 20000
    }
  ]
}
```

### PUT /api/orders
Update order status and/or notes.

**Request Body:**
```json
{
  "id": "order-uuid",
  "order_status": "processing",
  "notes": "Order packed and ready for dispatch"
}
```

**Response:**
```json
{
  "id": "order-uuid",
  "order_status": "processing",
  "notes": "Order packed and ready for dispatch",
  "updated_at": "2024-03-25T11:00:00Z"
}
```

## Admin Workflow

### Typical Order Processing Flow

```
1. Customer places order → Order Status: "pending"
2. Admin verifies payment → Status: "confirmed"
3. Admin prepares order → Status: "processing"
   └─ Add notes: "Order packed, items verified"
4. Order sent to delivery → Status: "shipped"
   └─ Add notes: "Handed to delivery partner"
5. Customer receives order → Status: "delivered"
6. Customer confirms receipt → Status: "completed"
```

### Example Admin Actions

**1. Check Pending Orders**
```
1. Go to /admin/orders
2. Filter: "Pending" status
3. See all orders awaiting confirmation
```

**2. Update Order Status**
```
1. Click on order to expand
2. Select new status from dropdown
3. Status updates immediately
```

**3. Add Delivery Notes**
```
1. Expand order details
2. In "Delivery Notes" textarea, add:
   - Special handling instructions
   - Customer contact notes
   - Delivery partner info
   - Any issues or observations
3. Click outside textarea to auto-save
```

**4. Search for Customer Order**
```
1. Use search box at top
2. Search by:
   - Customer name: "John Doe"
   - Email: "john@example.com"
   - Order ID: "550e8400-e29b"
3. Filtered results appear instantly
```

**5. View Full Order Details**
```
1. Click order card to expand
2. See all:
   - Customer info
   - Delivery address
   - Payment details
   - Order items
   - Current status
   - Delivery notes
```

## Status Badge Colors

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| pending | Yellow | ⏳ | Waiting for confirmation |
| confirmed | Blue | ✓ | Order confirmed |
| processing | Purple | ⚙️ | Being prepared |
| shipped | Indigo | 📦 | In transit |
| delivered | Green | 🚚 | Delivered to customer |
| completed | Emerald | ✅ | Order complete |

## Stats Dashboard

The stats cards at the top show:
- **Total Orders**: All orders in system
- **Pending**: Orders awaiting confirmation (payment verification)
- **Processing**: Orders being prepared
- **Shipped**: Orders in delivery
- **Delivered**: Orders reached destination

These update in real-time as order statuses change.

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to fetch orders" | API error | Check database connection |
| "Failed to update order" | Status not valid | Use valid status values |
| "Order not found" | Invalid order ID | Verify order exists |
| Network timeout | Slow connection | Retry or refresh page |

## Future Enhancements

### Phase 1 (Current)
✅ View all orders
✅ Filter by status
✅ Search orders
✅ Update order status
✅ Add delivery notes
✅ View order items
✅ Stats dashboard

### Phase 2 (Recommended)
- [ ] Export orders to CSV
- [ ] Print order receipts
- [ ] Email customer on status change
- [ ] SMS notifications
- [ ] Bulk status update
- [ ] Order timeline view
- [ ] Analytics dashboard

### Phase 3 (Advanced)
- [ ] Integrate with delivery API
- [ ] Real-time delivery tracking
- [ ] Customer communication
- [ ] Refund management
- [ ] Return requests
- [ ] Inventory sync

## Performance Tips

1. **Search Efficiently**: Use exact order ID for fastest lookup
2. **Filter First**: Filter by status before searching
3. **Batch Updates**: Consider bulk status updates for multiple orders
4. **Monitor Stats**: Check dashboard regularly for pending orders

## Security Notes

- Orders API uses `SUPABASE_SERVICE_ROLE_KEY` for admin access
- Only admin users should access `/admin/orders`
- All order modifications are logged with timestamps
- Customer data is protected and displayed only to admins

## Testing

### Test Data
Order flow to test:
```
1. Create account: test@example.com
2. Add items to cart
3. Complete checkout
4. Use test card: 4111 1111 1111 1111
5. Go to admin orders
6. Find order in list
7. Expand and update status
8. Add notes
9. View on customer profile
```

### Test Scenarios
- [ ] Filter by status shows correct orders
- [ ] Search finds order by email
- [ ] Status update saves immediately
- [ ] Notes save and persist
- [ ] Order items display correctly
- [ ] Totals calculate correctly

---

**Status:** ✅ Complete  
**Last Updated:** March 25, 2026  
**Version:** 1.0
