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
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser(email, password, role, name, id) {
  console.log(`Creating user: ${email} with role ${role}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  });

  if (error) {
    if (error.message.includes('already exists') || error.message.includes('User already registered')) {
        console.log(`User ${email} already exists. Updating password...`);
        // If they already exist, we need to get their ID to update password
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingUser = usersData.users.find(u => u.email === email);
        if (existingUser) {
           await supabase.auth.admin.updateUserById(existingUser.id, { password, user_metadata: { role } });
           return existingUser;
        }
    } else {
        console.error(`Error creating user ${email}:`, error);
    }
  }

  const user = data?.user;
  
  if (user) {
    console.log(`User created: ${user.id}`);
    
    // Insert into users_roles
    await supabase.from('users_roles').upsert({
      id: user.id,
      role: role
    });

    if (role === 'FACULTY') {
      await supabase.from('faculty_profiles').upsert({
        id: user.id,
        name: name,
        status: 'APPROVED'
      });
    }
    
    return user;
  }
}

async function main() {
  await createUser('admin@attendance.com', 'Admin@123!', 'SUPER_ADMIN', 'Super Admin');
  await createUser('faculty1@attendance.com', 'Faculty@123!', 'FACULTY', 'Prof. John Doe');
  console.log("Done seeding users.");
}

main().catch(console.error);
