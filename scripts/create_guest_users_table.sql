-- Create guest_users table for storing guest customer information
CREATE TABLE IF NOT EXISTS guest_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  auth_method VARCHAR(20) DEFAULT 'email',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE guest_users DROP COLUMN IF EXISTS password_hash;

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_guest_users_email ON guest_users(email);

-- Create index for auth_method lookup
CREATE INDEX IF NOT EXISTS idx_guest_users_auth_method ON guest_users(auth_method);
