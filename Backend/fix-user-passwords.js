const { supabase } = require('./config/db');
const bcrypt = require('bcrypt');

async function fixUserPasswords() {
    try {
        console.log('🔍 Checking for users with plain text passwords...');
        
        // Get all users
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, password, first_name, last_name');
        
        if (error) {
            console.error('❌ Error fetching users:', error);
            return;
        }
        
        console.log(`📊 Found ${users.length} users in database`);
        
        let fixedCount = 0;
        
        for (const user of users) {
            try {
                // Try to verify if password is already hashed (bcrypt hashes start with $2b$)
                const isAlreadyHashed = user.password.startsWith('$2b$');
                
                if (!isAlreadyHashed) {
                    console.log(`🔧 Fixing password for user: ${user.email}`);
                    
                    // Hash the plain text password
                    const hashedPassword = await bcrypt.hash(user.password, 5);
                    
                    // Update the user
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ password: hashedPassword })
                        .eq('id', user.id);
                    
                    if (updateError) {
                        console.error(`❌ Error updating password for ${user.email}:`, updateError);
                    } else {
                        console.log(`✅ Password fixed for ${user.email}`);
                        fixedCount++;
                    }
                } else {
                    console.log(`✅ Password already hashed for ${user.email}`);
                }
            } catch (err) {
                console.error(`❌ Error processing user ${user.email}:`, err);
            }
        }
        
        console.log(`\n🎉 Process completed! Fixed ${fixedCount} passwords.`);
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

// Run the function if this script is executed directly
if (require.main === module) {
    fixUserPasswords();
}

module.exports = { fixUserPasswords };
