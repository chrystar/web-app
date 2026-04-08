-- Add guest_user_id column to orders table (link orders to guest users)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_user_id UUID REFERENCES guest_users(id) ON DELETE SET NULL;

-- Add order status enum-like column for better tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'pending';
-- Status values: 'pending' -> 'confirmed' -> 'processing' -> 'shipped' -> 'delivered' -> 'completed'

-- Add notes column for admin/delivery notes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for guest_user_id lookup
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON orders(guest_user_id);

-- Create index for order status lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);

-- Create index for email lookup (for guest order tracking)
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
