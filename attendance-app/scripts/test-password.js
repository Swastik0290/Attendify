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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testPasswordReset() {
  const email = 'arpan4747@gmail.com'
  const newPass = 'Pass1234'
  
  const { data, error } = await admin.auth.admin.listUsers()
  const user = data.users.find(u => u.email === email)
  console.log('User found:', user.id)

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password: newPass })
  if (updateErr) {
    console.error('Update Error:', updateErr.message)
    return
  }
  console.log('Password updated successfully via admin API')
  
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email,
    password: newPass
  })
  
  if (loginErr) {
    console.error('Login after update Error:', loginErr.message)
  } else {
    console.log('Login Success!')
  }
}
testPasswordReset()
