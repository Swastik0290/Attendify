/* eslint-disable */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function provisionAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/provision-super-admin.js <email>");
    process.exit(1);
  }

  console.log(`Searching for user with email: ${email}`);

  // Fetch all users (simplification, suitable for dev)
  // In production with many users, you might need pagination or a specific email search
  const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching users:", authError.message);
    process.exit(1);
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found in Supabase Auth. Have they logged in via Google yet?`);
    process.exit(1);
  }

  console.log(`Found user! ID: ${user.id}`);
  console.log(`Assigning SUPER_ADMIN role...`);

  const { error: roleError } = await adminClient.from('users_roles').upsert({
    id: user.id,
    role: 'SUPER_ADMIN'
  });

  if (roleError) {
    console.error("Error assigning role:", roleError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully provisioned ${email} as SUPER_ADMIN.`);
}

provisionAdmin().catch(console.error);
