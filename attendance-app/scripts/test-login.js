const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const dotenv = require('dotenv')

const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
for (const k in envConfig) process.env[k] = envConfig[k]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'arpan4747@gmail.com',
    password: 'Pass1234'
  })
  if (error) {
    console.error('Login Error:', error.message)
  } else {
    console.log('Login Success:', data.user.id)
  }
}
testLogin()
