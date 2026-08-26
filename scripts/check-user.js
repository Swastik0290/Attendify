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

async function checkUser() {
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) {
    console.error(error)
    return
  }
  const user = data.users.find(u => u.email === 'arpan4747@gmail.com')
  console.log('User found:', user ? 'Yes' : 'No')
  if (user) {
    console.log('Email confirmed at:', user.email_confirmed_at)
    console.log('App metadata:', user.app_metadata)
    console.log('Identities:', user.identities)
  }
}
checkUser()
