const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  // Create dummy admin user
  const email = 'superadmin@attendanceiq.test';
  
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
  });

  if (createError && !createError.message.includes('already exists')) {
    console.error('Failed to create user:', createError);
    return;
  }

  let uid = newUser?.user?.id;
  
  if (!uid) {
    const { data } = await adminClient.auth.admin.listUsers();
    uid = data.users.find(u => u.email === email)?.id;
  }

  // Update users_roles
  await adminClient.from('users_roles').upsert({ id: uid, role: 'SUPER_ADMIN' });
  console.log('Successfully provisioned', email, 'as SUPER_ADMIN with password: Password123!');
}

run().catch(console.error);
