# Quick Start Guide

## ✅ What You Need to Do Right Now

### 1. Create Tables in Supabase (CRITICAL - Fixes the error)

Your app is showing: `Could not find the table 'public.products' in the schema cache`

This means the database tables don't exist yet. Follow these exact steps:

#### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com → Open your project
2. Click **SQL Editor** in the left sidebar
3. Click the **"+"** button to create a new query

#### Step 2: Create Products Table (Copy & Paste)
Copy this entire block and paste into SQL Editor, then click **"Run"**:

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

CREATE INDEX idx_products_category ON products(category);

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

Wait for "Success" message ✓

#### Step 3: Create Orders Table (Copy & Paste)
Click **"+"** again, copy & paste this, then click **"Run"**:

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

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

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

#### Step 4: Create Order Items Table (Copy & Paste)
Click **"+"** again, copy & paste this, then click **"Run"**:

```sql
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

#### Step 5: Create Banners Table (Copy & Paste)
Click **"+"** again, copy & paste this, then click **"Run"**:

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

### 2. Enable Row Level Security (RLS)

**IMPORTANT:** Without this, anyone can access/modify your data!

Click **"+"** to create new query, copy & paste this, then click **"Run"**:

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

-- Orders: Readable by authenticated users
CREATE POLICY "Orders are readable by authenticated users"
  ON orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Order Items
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

### 3. Create Storage Bucket for Images

1. Go to **Storage** in left sidebar
2. Click **Create new bucket**
3. Name: `products`
4. **UNCHECK** "Private bucket" (make it public)
5. Click **Create bucket**

### 4. Refresh Your App

1. Go to http://localhost:3000
2. You should now see products loading!

## Next Steps

1. **Login to admin:**
   - Go to http://localhost:3000/admin/login
   - Use the admin credentials you created earlier
   - If you don't have an admin user yet, go to Supabase → **Authentication** → **Users** → **Add user**

2. **Add a product:**
   - Click **Products** in sidebar
   - Click **Add Product**
   - Fill in the form and upload an image
   - Click **Create Product**

3. **See it on the main site:**
   - Go back to http://localhost:3000
   - You should see your product in the products list!

## Need Help?

Check `SUPABASE_SETUP.md` for detailed information about:
- Database schema
- Authentication setup
- Troubleshooting issues
