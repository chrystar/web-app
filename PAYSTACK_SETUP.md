# Paystack Integration Setup Guide

## Overview
The checkout page now integrates with Paystack for payment processing. This guide explains how to set up and use the integration.

## Prerequisites
- A Paystack account (https://dashboard.paystack.com)
- Your Paystack Public and Secret keys

## Setup Steps

### 1. Get Your Paystack Keys
1. Log in to your Paystack Dashboard
2. Go to Settings → API Keys & Webhooks
3. Copy your **Public Key** and **Secret Key**

### 2. Add Environment Variables
Add the following to your `.env.local` file:

```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_public_key_here
PAYSTACK_SECRET_KEY=your_secret_key_here
```

### 3. Database Tables
Make sure you have the following tables in Supabase:

#### orders table
```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name VARCHAR NOT NULL,
  customer_email VARCHAR NOT NULL,
  customer_phone VARCHAR NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lga VARCHAR NOT NULL,
  payment_method VARCHAR NOT NULL,
  payment_reference VARCHAR NOT NULL UNIQUE,
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### order_items table
```sql
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_id BIGINT NOT NULL,
  product_name VARCHAR NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## How It Works

1. **Checkout Form**: Customer fills in delivery and payment information
2. **Payment Processing**: When "Place Order" is clicked:
   - Paystack popup appears
   - Customer enters card/payment details
   - Paystack processes the payment
3. **Verification**: Backend verifies payment with Paystack API
4. **Order Creation**: If payment is successful:
   - Order is created in the database
   - Order items are added
   - Cart is cleared
   - Customer is redirected to order confirmation page

## Payment Methods Available

- Credit/Debit Card
- Bank Transfer
- USSD
- Pay on Delivery (for future integration)

## Testing

### Test Cards (in Paystack Test Mode)
- **Card Number**: 4111111111111111
- **Expiry**: Any future date
- **CVV**: 123
- **OTP**: 123456

Make sure your Paystack account is in **Test Mode** for testing.

## Order Status

Orders are created with status `confirmed` once payment is successful. You can extend this to include:
- pending
- processing
- shipped
- delivered
- cancelled

## Important Notes

1. Never expose your Secret Key in client-side code
2. The payment reference is unique and tied to each transaction
3. Webhooks can be set up in Paystack dashboard for real-time updates
4. For production, ensure your Paystack account is in Live Mode
5. All amounts are in Nigerian Naira (₦)

## Troubleshooting

**Payment window not opening**: Check that `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is correctly set in `.env.local`

**Order not creating**: Verify database tables exist and Supabase credentials are correct

**Payment verification failed**: Check `PAYSTACK_SECRET_KEY` and ensure payment was actually successful in Paystack dashboard
