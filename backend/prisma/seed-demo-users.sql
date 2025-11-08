-- Create Demo Users for 24Rx Platform
-- Password for all users: demo123 (hashed with bcrypt)

-- Insert demo users with APPROVED status
INSERT INTO users (id, name, email, phone, password, role_code, status, is_active, created_at, updated_at)
VALUES 
  -- Demo Seller
  (gen_random_uuid(), 'Demo Seller', 'demo@seller.com', '+1234567890', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'SELLER', 'APPROVED', true, NOW(), NOW()),
  
  -- Demo Trader
  (gen_random_uuid(), 'Demo Trader', 'demo@trader.com', '+1234567891', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'TRADER', 'APPROVED', true, NOW(), NOW()),
  
  -- Admin User
  (gen_random_uuid(), 'Admin User', 'admin@24rx.com', '+1234567892', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', 'APPROVED', true, NOW(), NOW())

ON CONFLICT (email) DO NOTHING;

-- Verify users created
SELECT name, email, role_code, status FROM users WHERE email IN ('demo@seller.com', 'demo@trader.com', 'admin@24rx.com');
