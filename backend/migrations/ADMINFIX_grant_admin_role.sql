-- AdminFix: Grant admin role to test user
-- Run this to make test@deedpro-check.com an admin

-- First, check if role column exists (it should)
-- If not, add it:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Grant admin role to test user
UPDATE users 
SET role = 'admin' 
WHERE email = 'test@deedpro-check.com';

-- Verify the update
SELECT id, email, role, plan 
FROM users 
WHERE email = 'test@deedpro-check.com';

