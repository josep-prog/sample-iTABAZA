const { supabase } = require('./config/db');

async function debugSignup() {
    console.log('🔍 Debugging signup process...\n');
    
    try {
        // Check current users in database
        console.log('1️⃣ Checking current users in database...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, mobile, created_at')
            .order('created_at', { ascending: false });
        
        if (usersError) {
            console.error('❌ Error fetching users:', usersError);
            return;
        }
        
        console.log(`✅ Found ${users.length} users in database:`);
        users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - ${user.created_at}`);
        });
        
        // Test direct signup
        console.log('\n2️⃣ Testing direct signup...');
        const testUser = {
            first_name: 'Debug',
            last_name: 'User',
            email: `debug.${Date.now()}@example.com`,
            mobile: `+25078${Math.floor(Math.random() * 10000000)}`,
            password: 'debugpass123'
        };
        
        const response = await fetch('http://localhost:8080/user/signup-direct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });
        
        const result = await response.json();
        console.log('Response:', result);
        
        // Check if user was created
        console.log('\n3️⃣ Checking if user was created...');
        const { data: newUser, error: newUserError } = await supabase
            .from('users')
            .select('*')
            .eq('email', testUser.email)
            .single();
        
        if (newUserError) {
            console.error('❌ User not found in database:', newUserError);
        } else {
            console.log('✅ User created successfully:', {
                id: newUser.id,
                name: `${newUser.first_name} ${newUser.last_name}`,
                email: newUser.email,
                mobile: newUser.mobile
            });
        }
        
        // Test OTP-based signup
        console.log('\n4️⃣ Testing OTP-based signup...');
        const otpUser = {
            first_name: 'OTP',
            last_name: 'Test',
            email: `otp.debug.${Date.now()}@example.com`,
            mobile: `+25078${Math.floor(Math.random() * 10000000)}`,
            password: 'otppass123'
        };
        
        // Step 1: Send OTP
        const otpResponse = await fetch('http://localhost:8080/user/emailVerify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: otpUser.email })
        });
        
        const otpResult = await otpResponse.json();
        console.log('OTP sent:', otpResult);
        
        // Step 2: Complete signup
        const signupResponse = await fetch('http://localhost:8080/user/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(otpUser)
        });
        
        const signupResult = await signupResponse.json();
        console.log('Signup result:', signupResult);
        
        // Check if OTP user was created
        console.log('\n5️⃣ Checking if OTP user was created...');
        const { data: otpNewUser, error: otpNewUserError } = await supabase
            .from('users')
            .select('*')
            .eq('email', otpUser.email)
            .single();
        
        if (otpNewUserError) {
            console.error('❌ OTP User not found in database:', otpNewUserError);
        } else {
            console.log('✅ OTP User created successfully:', {
                id: otpNewUser.id,
                name: `${otpNewUser.first_name} ${otpNewUser.last_name}`,
                email: otpNewUser.email,
                mobile: otpNewUser.mobile
            });
        }
        
        // Final count
        console.log('\n6️⃣ Final user count...');
        const { data: finalUsers, error: finalError } = await supabase
            .from('users')
            .select('count');
        
        if (finalError) {
            console.error('❌ Error getting final count:', finalError);
        } else {
            console.log('✅ Total users in database:', finalUsers[0].count);
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

debugSignup();
