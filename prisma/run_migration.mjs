// Run this script to safely migrate existing data to the new Profile-based schema
// Usage: node prisma/run_migration.mjs

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runMigration() {
  console.log('🚀 Starting Profile migration...')
  
  try {
    // Step 1: Create Profile table
    console.log('\n📋 Step 1: Creating Profile table...')
    await prisma.$executeRawUnsafe(`
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
      )
    `)
    console.log('✅ Profile table ready')

    // Step 2: Add FK from Profile to User
    console.log('\n🔗 Step 2: Adding foreign key...')
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Profile"
          ADD CONSTRAINT "Profile_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      `)
      console.log('✅ FK added')
    } catch { console.log('⚠️  FK may already exist, skipping') }

    // Step 3: Create default profiles for all existing users
    console.log('\n👤 Step 3: Creating default profiles for existing users...')
    const users = await prisma.$queryRaw`
      SELECT u.id, u.name, COALESCE(u."monthlyBudget", 15000) as budget, COALESCE(u."savingsGoal", 2000) as savings
      FROM "User" u
      WHERE NOT EXISTS (SELECT 1 FROM "Profile" p WHERE p."userId" = u.id)
    `
    
    for (const user of users) {
      const studentProfileId = `prof_${user.id}_student`
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Profile" ("id", "userId", "name", "avatar", "color", "type", "monthlyBudget", "savingsGoal", "createdAt")
        VALUES ($1, $2, 'Student Life', '🎓', '#155EEF', 'budget', $3, $4, NOW())
        ON CONFLICT DO NOTHING
      `, studentProfileId, user.id, Number(user.budget), Number(user.savings))
      
      const devProfileId = `prof_${user.id}_dev`
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Profile" ("id", "userId", "name", "avatar", "color", "type", "monthlyBudget", "savingsGoal", "createdAt")
        VALUES ($1, $2, 'Developer', '💻', '#7A5AF8', 'business', 0, 0, NOW())
        ON CONFLICT DO NOTHING
      `, devProfileId, user.id)
      console.log(`  ✅ Created profiles for ${user.name}`)
    }

    // Step 4: Add profileId columns and make old userId columns nullable
    console.log('\n📝 Step 4: Adding profileId columns...')
    const tables = ['Expense', 'Conversation', 'CategoryBudget', 'RecurringExpense', 'Achievement', 'Notification']
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "profileId" TEXT`)
        console.log(`  ✅ Added profileId to ${table}`)
      } catch (e) { console.log(`  ⚠️  ${table}: ${e.message?.split('\n')[0]}`) }
      
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "userId" DROP NOT NULL`)
        console.log(`  ✅ Made userId nullable in ${table}`)
      } catch (e) { console.log(`  ⚠️  Failed to make userId nullable in ${table}: ${e.message?.split('\n')[0]}`) }
    }

    // Step 5: Populate profileId from userId
    console.log('\n🔄 Step 5: Populating profileId from userId...')
    for (const table of tables) {
      try {
        const result = await prisma.$executeRawUnsafe(`
          UPDATE "${table}" t
          SET "profileId" = (
            SELECT p."id" FROM "Profile" p WHERE p."userId" = t."userId" AND p."name" = 'Student Life' LIMIT 1
          )
          WHERE t."userId" IS NOT NULL AND t."profileId" IS NULL
        `)
        console.log(`  ✅ Updated ${table}: ${result} rows`)
      } catch (e) { console.log(`  ⚠️  ${table}: ${e.message?.split('\n')[0]}`) }
    }

    // Step 6: Add FK constraints for profileId
    console.log('\n🔗 Step 6: Adding profileId foreign keys...')
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${table}"
            ADD CONSTRAINT "${table}_profileId_fkey"
            FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        `)
        console.log(`  ✅ FK added for ${table}`)
      } catch { console.log(`  ⚠️  ${table} FK may already exist`) }
    }

    // Step 7: Updating RecurringExpense with schedule columns
    console.log('\n📅 Step 7: Adding recurring schedule columns...')
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "dayOfMonth" INTEGER`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "dayOfWeek" INTEGER`)
      console.log(`  ✅ Added dayOfMonth and dayOfWeek to RecurringExpense`)
    } catch (e) {
      console.log(`  ⚠️  Error adding schedule columns: ${e.message?.split('\n')[0]}`)
    }

    // Step 8: Unique constraint on CategoryBudget
    console.log('\n🔑 Step 8: Updating CategoryBudget unique constraint...')
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "CategoryBudget" DROP CONSTRAINT IF EXISTS "CategoryBudget_userId_category_key"`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_profileId_category_key" UNIQUE ("profileId", "category")`)
      console.log('  ✅ Unique constraint updated')
    } catch (e) { console.log(`  ⚠️  ${e.message?.split('\n')[0]}`) }

    // Step 8: Add WishlistItem table (from upstream)
    console.log('\n📋 Step 8: Creating WishlistItem table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WishlistItem" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "name"      TEXT NOT NULL,
        "price"     DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
      )
    `)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "WishlistItem"
          ADD CONSTRAINT "WishlistItem_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      `)
    } catch { console.log('  ⚠️  WishlistItem FK may already exist') }
    console.log('  ✅ WishlistItem table ready')

    // Step 9: Add MonthlyBudget table (per-month budget overrides)
    console.log('\n📋 Step 9: Creating MonthlyBudget table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MonthlyBudget" (
        "id"          TEXT NOT NULL,
        "profileId"   TEXT NOT NULL,
        "year"        INTEGER NOT NULL,
        "month"       INTEGER NOT NULL,
        "budget"      DOUBLE PRECISION NOT NULL,
        "savingsGoal" DOUBLE PRECISION NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
      )
    `)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "MonthlyBudget"
          ADD CONSTRAINT "MonthlyBudget_profileId_fkey"
          FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      `)
    } catch { console.log('  ⚠️  MonthlyBudget FK may already exist') }
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_profileId_year_month_key" UNIQUE ("profileId", "year", "month")
      `)
    } catch { console.log('  ⚠️  MonthlyBudget unique constraint may already exist') }
    console.log('  ✅ MonthlyBudget table ready')

    // Step 10: Add fixed-bill flags
    console.log('\n📌 Step 10: Adding fixed-bill columns...')
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "fixed" BOOLEAN NOT NULL DEFAULT false`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "fixed" BOOLEAN`)
      // Existing rent/internet recurring bills keep their current behaviour
      await prisma.$executeRawUnsafe(`UPDATE "RecurringExpense" SET "fixed" = true WHERE "category" IN ('rent', 'internet') OR "item" ~* '\\yrent\\y'`)
      console.log('  ✅ Fixed-bill columns ready')
    } catch (e) { console.log(`  ⚠️  ${e.message?.split('\n')[0]}`) }

    // Verify
    console.log('\n🎉 Migration complete! Verifying...')
    const profileCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Profile"`
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`
    console.log(`✅ Users: ${userCount[0].count}, Profiles: ${profileCount[0].count}`)
    
    // Check expenses
    const expenseCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Expense" WHERE "profileId" IS NOT NULL`
    console.log(`✅ Expenses with profileId: ${expenseCount[0].count}`)

  } catch (error) {
    console.error('❌ Migration failed:', error.message || error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
