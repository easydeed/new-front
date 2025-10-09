-- Normalize role names to 'admin' (lowercase)
UPDATE users SET role = 'admin' WHERE LOWER(role) = 'administrator';
