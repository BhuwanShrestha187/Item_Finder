-- SQL script to remove email verification and password reset columns
ALTER TABLE users 
DROP COLUMN IF EXISTS is_email_verified,
DROP COLUMN IF EXISTS email_verification_token,
DROP COLUMN IF EXISTS email_verification_token_expires,
DROP COLUMN IF EXISTS password_reset_token,
DROP COLUMN IF EXISTS password_reset_token_expires;

-- Comment this out if you want to keep these columns
-- DROP COLUMN IF EXISTS role,
-- DROP COLUMN IF EXISTS profile_picture,
-- DROP COLUMN IF EXISTS phone_number,
-- DROP COLUMN IF EXISTS preferences;