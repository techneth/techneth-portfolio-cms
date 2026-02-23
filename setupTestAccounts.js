const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestAccounts() {
    const roles = ['super_admin', 'admin', 'editor'];
    const passwords = 'TestPassword123!';

    for (const role of roles) {
        const email = `test_${role}@techneth.com`;
        console.log(`Setting up account for ${email}...`);

        // Check if user exists in auth.users by trying to sign up, or just querying them.
        // Easiest is to create/update using admin API

        let userId;

        // Try getting user first
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Error listing users', listError);
            continue;
        }

        let user = usersData.users.find(u => u.email === email);

        if (user) {
            console.log(`User ${email} already exists, updating password...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                user.id,
                { password: passwords }
            );
            if (updateError) {
                console.error(`Failed to update password for ${email}:`, updateError);
            }
            userId = user.id;
        } else {
            console.log(`Creating user ${email}...`);
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
                email,
                password: passwords,
                email_confirm: true,
                user_metadata: { name: `Test ${role}`, role: role }
            });

            if (createError) {
                console.error(`Failed to create ${email}:`, createError);
                continue;
            }
            userId = createData.user.id;
            console.log(`Created user ${userId}`);
        }

        // Now upsert into public.users
        const { error: dbError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email,
                name: `Test ${role}`,
                role: role,
                is_active: true,
            });

        if (dbError) {
            console.error(`Failed to update public.users for ${email}:`, dbError);
        } else {
            console.log(`Updated public.users for ${email} as ${role}`);
        }
    }
}

setupTestAccounts().then(() => console.log('Done'));
