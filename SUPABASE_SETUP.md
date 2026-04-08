# Supabase Setup Guide

This guide will walk you through setting up Supabase for the chicken shop admin panel.

## Prerequisites

- Supabase account (create at https://supabase.com)
- Project created in Supabase dashboard

## Step 1: Create Tables

Go to your Supabase project dashboard → SQL Editor and run the following SQL scripts:

### Copy and Paste Each Section

Click the "+" button in SQL Editor and paste each script below, then click "Run".

### 1.1 Create Products Table

```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  weight VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on category for faster queries
CREATE INDEX idx_products_category ON products(category);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_products_updated_at();
```

### 1.2 Create Orders Table

```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on status for filtering
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();
```

### 1.3 Create Order Items Table

```sql
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### 1.4 Create Banners Table

```sql
CREATE TABLE banners (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER banners_updated_at
BEFORE UPDATE ON banners
FOR EACH ROW
EXECUTE FUNCTION update_banners_updated_at();
```

## Step 2: Enable Row Level Security (RLS)

Enable RLS on all tables:

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Products: Public read, authenticated admin write
CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can create products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete products"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Orders: Public read own orders, authenticated admin full access
CREATE POLICY "Orders are readable by authenticated users"
  ON orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Order Items: Readable by authenticated users
CREATE POLICY "Order items are readable by authenticated users"
  ON order_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Banners: Public read, authenticated admin write
CREATE POLICY "Banners are publicly readable"
  ON banners FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can manage banners"
  ON banners FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update banners"
  ON banners FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete banners"
  ON banners FOR DELETE
  USING (auth.role() = 'authenticated');
```

## Step 3: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Click **Storage** → **Create new bucket**
3. Name it `products`
4. Disable **Private bucket** (make it public)
5. Click **Create bucket**

### Configure Storage Policies

Go to **Storage** → **products** → **Policies**

Add this policy for public read access:

```sql
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');
```

Add this policy for authenticated users to upload:

```sql
CREATE POLICY "Authenticated users can upload to products"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
```

## Step 4: Insert Sample Data

```sql
-- Insert sample products
INSERT INTO products (name, description, price, weight, category, image_url)
VALUES
  ('Whole Chicken', 'Fresh whole chicken, ready to cook', 8.99, '1.5 kg', 'Whole Chicken', NULL),
  ('Chicken Drumsticks', 'Juicy chicken drumsticks perfect for grilling', 5.99, '1 kg', 'Drumsticks', NULL),
  ('Chicken Wings', 'Perfect for appetizers and parties', 4.99, '800g', 'Wings', NULL),
  ('Chicken Breast', 'Lean and healthy protein option', 6.99, '1 kg', 'Breast', NULL),
  ('Chicken Thighs', 'Flavorful and juicy thighs', 5.49, '900g', 'Thighs', NULL),
  ('Mixed Chicken Pack', 'Mix of different chicken parts', 12.99, '2 kg', 'Whole Chicken', NULL);

-- Insert sample banners
INSERT INTO banners (title, description, image_url, is_active, sort_order)
VALUES
  ('Fresh Chicken Delivery', 'Get fresh chicken delivered to your door', '/images/banner-1.jpg', true, 1),
  ('Spring Sale', 'Special spring discounts on all products', '/images/banner-2.jpg', true, 2),
  ('Quality Guarantee', 'We guarantee the freshest chicken in town', '/images/banner-3.jpg', true, 3);
```

## Step 5: Configure Environment Variables

Update your `.env.local` file with Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### How to Get Your Credentials:

1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 6: Create Admin User

### Option 1: Via Supabase Dashboard (Recommended for Testing)

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email and password
4. Click **Create user**

### Option 2: Via Script

Use the provided `scripts/create-admin.js`:

```bash
npm run create-admin
```

You'll be prompted to enter:
- Admin email
- Admin password

## Step 7: Verify Setup

Test the connection by:

1. Starting the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/admin/login`

3. Log in with your admin credentials

4. Try adding a product to verify the API connection works

## Database Schema Overview

### Products Table
- `id`: Unique identifier (auto-incrementing)
- `name`: Product name
- `description`: Product details
- `price`: Price in dollars
- `weight`: Product weight/size
- `category`: Product category (Whole Chicken, Drumsticks, Wings, Breast, Thighs)
- `image_url`: URL to product image
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Orders Table
- `id`: Unique identifier (auto-incrementing)
- `order_number`: Unique order reference number
- `customer_email`: Customer email address
- `customer_phone`: Customer phone number
- `customer_address`: Delivery address
- `status`: Order status (pending, confirmed, shipped, delivered, cancelled)
- `total_amount`: Total order amount
- `notes`: Special instructions or notes
- `created_at`: Order creation timestamp
- `updated_at`: Last update timestamp

### Order Items Table
- `id`: Unique identifier (auto-incrementing)
- `order_id`: Reference to parent order
- `product_id`: Reference to product
- `quantity`: Number of items ordered
- `unit_price`: Price at time of order
- `created_at`: Creation timestamp

### Banners Table
- `id`: Unique identifier (auto-incrementing)
- `title`: Banner title
- `description`: Banner description
- `image_url`: URL to banner image
- `link_url`: URL banner links to
- `is_active`: Whether banner is displayed
- `sort_order`: Display order
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Troubleshooting

### "Could not find the table 'public.products' in the schema cache"
**Solution:** You haven't created the tables in Supabase yet.
1. Go to your Supabase project → **SQL Editor**
2. Click the **"+"** button to create a new query
3. Copy and paste **Section 1.1** (Create Products Table) from Step 1
4. Click **"Run"** button
5. Wait for it to complete (check for "Success" message)
6. Repeat for remaining table creation scripts (1.2, 1.3, 1.4)
7. Refresh the browser and try again

### "Received NaN for the value attribute"
**Solution:** This is fixed in the latest code. Make sure you're on the latest version.

### "hostname is not configured under images in your next.config.js"
**Solution:** This is already configured in the latest `next.config.ts`. No action needed.

### "Supabase connection failed"
- Check `.env.local` has correct URLs and keys
- Restart dev server after changing environment variables
- Verify Supabase project is active
- Ensure tables exist in Supabase (see "Could not find the table" solution above)

## API Integration

The application includes API routes that interact with these tables:

- `POST /api/auth/login` - User authentication
- `GET /api/products` - Fetch products
- `POST /api/products` - Create product
- `GET /api/products/[id]` - Get single product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

All API routes use the Supabase client configured in `/lib/supabase.ts`.
