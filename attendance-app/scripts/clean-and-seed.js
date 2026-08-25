/**
 * Nuclear cleanup — wipes all dummy/test data from Supabase.
 * Keeps ONLY the real superadmin@attendanceiq.test account.
 * Run: node scripts/clean-and-seed.js
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const dotenv = require('dotenv')

const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
for (const k in envConfig) process.env[k] = envConfig[k]

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function run() {
  console.log('🔴 Starting database cleanup...\n')

  // ─── 1. Wipe all application data (order matters for FK constraints) ───────
  console.log('  Clearing attendance_records...')
  await admin.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Clearing qr_nonces...')
  await admin.from('qr_nonces').delete().neq('nonce', '__placeholder__')

  console.log('  Clearing attendance_sessions...')
  await admin.from('attendance_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Clearing enrollments...')
  await admin.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Clearing subjects...')
  await admin.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Clearing student_profiles...')
  await admin.from('student_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Clearing faculty_profiles...')
  await admin.from('faculty_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Clearing passkeys...')
  const { error: pkError } = await admin.from('passkeys').delete().neq('id', '__placeholder__')
  if (pkError) console.log('  (passkeys table may not exist yet — skipping)')

  // ─── 2. Get all auth users ─────────────────────────────────────────────────
  console.log('\n  Fetching all auth users...')
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) { console.error('Failed to list users:', listErr); process.exit(1) }

  const ADMIN_EMAIL = 'superadmin@attendanceiq.test'

  // ─── 3. Delete everyone except the super admin ────────────────────────────
  for (const u of users) {
    if (u.email !== ADMIN_EMAIL) {
      console.log(`  Deleting auth user: ${u.email} (${u.id})`)
      const { error } = await admin.auth.admin.deleteUser(u.id)
      if (error) console.log(`    ⚠ Could not delete ${u.email}: ${error.message}`)
    }
  }

  // ─── 4. Find/create the super admin ──────────────────────────────────────
  const refreshed = await admin.auth.admin.listUsers()
  let adminUser = refreshed.data.users.find(u => u.email === ADMIN_EMAIL)

  if (!adminUser) {
    console.log('\n  Creating superadmin user...')
    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: 'Password123!',
      email_confirm: true,
    })
    if (ce) { console.error('Failed to create admin:', ce); process.exit(1) }
    adminUser = created.user
  } else {
    console.log(`\n  Super admin exists: ${adminUser.email} (${adminUser.id})`)
    // Ensure password is reset to known value
    await admin.auth.admin.updateUserById(adminUser.id, { password: 'Password123!' })
    console.log('  Password reset to: Password123!')
  }

  // ─── 5. Clear and re-insert users_roles ──────────────────────────────────
  console.log('\n  Clearing users_roles...')
  await admin.from('users_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('  Inserting SUPER_ADMIN role...')
  const { error: roleErr } = await admin.from('users_roles').upsert({
    id: adminUser.id,
    role: 'SUPER_ADMIN',
  })
  if (roleErr) console.error('Failed to insert role:', roleErr)

  // ─── 6. Reset roll_schemas to clean default ───────────────────────────────
  console.log('\n  Resetting roll_schemas...')
  await admin.from('roll_schemas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin.from('roll_schemas').insert({
    name: 'Default Engineering Schema',
    is_global: true,
    config: {
      segments: [
        { name: 'Program',    start: 0, length: 1, type: 'numeric',      mappings: { '6': 'M.Tech Research', '4': 'B.Tech' } },
        { name: 'Year',       start: 1, length: 2, type: 'numeric',      mappings: { '26': '2026', '25': '2025', '24': '2024' } },
        { name: 'Department', start: 3, length: 2, type: 'alphanumeric', mappings: { 'EC': 'Electronics & Communication', 'CS': 'Computer Science', 'ME': 'Mechanical' } },
        { name: 'Serial',     start: 5, length: 4, type: 'numeric',      mappings: {} },
      ]
    }
  })

  console.log('\n✅ Cleanup complete!\n')
  console.log('─────────────────────────────────────────────')
  console.log('  SUPER ADMIN CREDENTIALS')
  console.log('  Email   : superadmin@attendanceiq.test')
  console.log('  Password: Password123!')
  console.log('  Login at: http://localhost:3000/admin/login')
  console.log('─────────────────────────────────────────────')
  console.log('\nThe database is clean. All future faculty, students,')
  console.log('subjects and attendance will be created through the app.\n')
}

run().catch(console.error)
