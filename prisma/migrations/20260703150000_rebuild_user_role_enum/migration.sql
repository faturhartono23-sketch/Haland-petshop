-- Rebuild UserRole enum with the current allowed values.
-- This migration creates a new enum type, migrates the existing column, drops the old enum, and renames the new enum.

BEGIN;

CREATE TYPE "UserRole_new" AS ENUM ('OWNER', 'ADMIN_KLINIK', 'DOKTER', 'CUSTOMER');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING "role"::text::"UserRole_new";

DROP TYPE "UserRole";

ALTER TYPE "UserRole_new" RENAME TO "UserRole";

COMMIT;
