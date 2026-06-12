-- ========================================================
-- Safe migration: Add Profile model while preserving data
-- ========================================================

-- 1. Create Profile table
CREATE TABLE IF NOT EXISTS "Profile" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "avatar"        TEXT NOT NULL DEFAULT '😊',
  "color"         TEXT NOT NULL DEFAULT '#155EEF',
  "type"          TEXT NOT NULL DEFAULT 'budget',
  "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 15000,
  "savingsGoal"   DOUBLE PRECISION NOT NULL DEFAULT 2000,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- 2. Add foreign key constraint on Profile -> User
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. For each existing user, create a default "Budget" profile and migrate their data
-- First, create profiles for all existing users
INSERT INTO "Profile" ("id", "userId", "name", "avatar", "color", "type", "monthlyBudget", "savingsGoal", "createdAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  SPLIT_PART(u."name", ' ', 1) || '''s Budget',
  '🎓',
  '#155EEF',
  'budget',
  COALESCE(u."monthlyBudget", 15000),
  COALESCE(u."savingsGoal", 2000),
  NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Profile" p WHERE p."userId" = u."id"
);

-- 4. Add nullable profileId to all data tables
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "profileId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "profileId" TEXT;
ALTER TABLE "CategoryBudget" ADD COLUMN IF NOT EXISTS "profileId" TEXT;
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "profileId" TEXT;
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "profileId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "profileId" TEXT;

-- 5. Populate profileId from userId by finding the first profile for each user
UPDATE "Expense" e
SET "profileId" = (
  SELECT p."id" FROM "Profile" p WHERE p."userId" = e."userId" LIMIT 1
)
WHERE e."userId" IS NOT NULL AND e."profileId" IS NULL;

UPDATE "Conversation" c
SET "profileId" = (
  SELECT p."id" FROM "Profile" p WHERE p."userId" = c."userId" LIMIT 1
)
WHERE c."userId" IS NOT NULL AND c."profileId" IS NULL;

UPDATE "CategoryBudget" cb
SET "profileId" = (
  SELECT p."id" FROM "Profile" p WHERE p."userId" = cb."userId" LIMIT 1
)
WHERE cb."userId" IS NOT NULL AND cb."profileId" IS NULL;

UPDATE "RecurringExpense" re
SET "profileId" = (
  SELECT p."id" FROM "Profile" p WHERE p."userId" = re."userId" LIMIT 1
)
WHERE re."userId" IS NOT NULL AND re."profileId" IS NULL;

UPDATE "Achievement" a
SET "profileId" = (
  SELECT p."id" FROM "Profile" p WHERE p."userId" = a."userId" LIMIT 1
)
WHERE a."userId" IS NOT NULL AND a."profileId" IS NULL;

UPDATE "Notification" n
SET "profileId" = (
  SELECT p."id" FROM "Profile" p WHERE p."userId" = n."userId" LIMIT 1
)
WHERE n."userId" IS NOT NULL AND n."profileId" IS NULL;

-- 6. Now make profileId NOT NULL (data should all be populated)
ALTER TABLE "Expense" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Conversation" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "CategoryBudget" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "RecurringExpense" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Achievement" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "profileId" SET NOT NULL;

-- 7. Add foreign key constraints for profileId
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CategoryBudget"
  ADD CONSTRAINT "CategoryBudget_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringExpense"
  ADD CONSTRAINT "RecurringExpense_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Achievement"
  ADD CONSTRAINT "Achievement_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Update unique constraint on CategoryBudget to use profileId
ALTER TABLE "CategoryBudget" DROP CONSTRAINT IF EXISTS "CategoryBudget_userId_category_key";
ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_profileId_category_key" UNIQUE ("profileId", "category");

-- Done! Data is migrated. Old userId columns remain for backward compatibility
-- (they can be dropped later once fully verified)
