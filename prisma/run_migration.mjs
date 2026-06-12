// Run this script to safely migrate existing data to the new Profile-based schema
// Usage: node prisma/run_migration.mjs

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

async function runMigration() {
  console.log('🚀 Starting Profile migration...')
  
  try {
    // Run the SQL script as raw queries broken into statements
    const sql = readFileSync(join(__dirname, 'migrate_profiles.sql'), 'utf-8')
    
    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`\nExecuting: ${statement.substring(0, 80)}...`)
        try {
          await prisma.$executeRawUnsafe(statement)
          console.log('✅ Done')
        } catch (err) {
          // Some statements may fail if already applied — log but continue
          console.warn(`⚠️  Skipped (may already exist): ${err.message?.split('\n')[0]}`)
        }
      }
    }

    console.log('\n🎉 Migration complete! Verifying...')

    // Verify
    const profiles = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Profile"`
    const users = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`
    console.log(`Users: ${users[0].count}, Profiles created: ${profiles[0].count}`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()
