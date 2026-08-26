/**
 * Applies the schema migration patch via Supabase REST API.
 * Run: node scripts/apply-migration.js
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const dotenv = require('dotenv')
const https = require('https')

const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
for (const k in envConfig) process.env[k] = envConfig[k]

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function applyMigration() {
  console.log('Applying schema migration...\n')

  // Add email column to faculty_profiles
  try {
    // Test if email column exists by querying with it
    const { error } = await admin.from('faculty_profiles').select('email').limit(1)
    if (error && error.message.includes('email')) {
      console.log('email column missing from faculty_profiles — needs manual SQL migration')
    } else {
      console.log('✓ faculty_profiles.email column exists')
    }
  } catch (e) {
    console.log('faculty_profiles check failed:', e.message)
  }

  // Add email column to student_profiles
  try {
    const { error } = await admin.from('student_profiles').select('email').limit(1)
    if (error && error.message.includes('email')) {
      console.log('email column missing from student_profiles — needs manual SQL migration')
    } else {
      console.log('✓ student_profiles.email column exists')
    }
  } catch (e) {
    console.log('student_profiles check failed:', e.message)
  }

  // Check passkeys table
  try {
    const { error } = await admin.from('passkeys').select('id').limit(1)
    if (error) {
      console.log('✗ passkeys table missing or error:', error.message)
      console.log('\n⚠️  You MUST run the SQL in supabase_migration_patch.sql manually in the Supabase SQL Editor!')
      console.log('   URL: https://supabase.com/dashboard/project/hisqqgqiiptizognljdb/sql')
    } else {
      console.log('✓ passkeys table exists')
    }
  } catch (e) {
    console.log('passkeys check failed:', e.message)
  }

  console.log('\n✅ Migration check complete.')
  console.log('   If any columns/tables are missing, run: supabase_migration_patch.sql')
}

applyMigration().catch(console.error)
