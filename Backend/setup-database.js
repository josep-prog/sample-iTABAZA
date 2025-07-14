const { supabase } = require('./config/db');

async function setupDatabase() {
    try {
        console.log('🚀 Setting up database...');
        
        // Test the connection first
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.error('❌ Database connection failed:', testError.message);
            return;
        }
        
        console.log('✅ Database connection successful');
        
        // Check which tables already exist
        const tablesToCheck = [
            'users', 'departments', 'doctors', 'appointments', 
            'voice_recordings', 'admins', 'documents', 
            'support_tickets', 'doctor_sessions', 'patient_sessions'
        ];
        
        console.log('🔍 Checking existing tables...');
        
        const existingTables = [];
        const missingTables = [];
        
        for (const tableName of tablesToCheck) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    if (error.message.includes('does not exist') || 
                        error.message.includes('relation') && error.message.includes('does not exist')) {
                        missingTables.push(tableName);
                        console.log(`❌ Table '${tableName}' does not exist`);
                    } else {
                        console.log(`⚠️  Table '${tableName}' - Error: ${error.message}`);
                    }
                } else {
                    existingTables.push(tableName);
                    console.log(`✅ Table '${tableName}' exists`);
                }
            } catch (checkError) {
                missingTables.push(tableName);
                console.log(`❌ Table '${tableName}' check failed: ${checkError.message}`);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`✅ Existing tables: ${existingTables.length}`);
        console.log(`❌ Missing tables: ${missingTables.length}`);
        
        if (existingTables.length > 0) {
            console.log(`\n✅ Existing tables: ${existingTables.join(', ')}`);
        }
        
        if (missingTables.length > 0) {
            console.log(`\n❌ Missing tables: ${missingTables.join(', ')}`);
            console.log('\n📋 To create missing tables, you can:');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Copy and paste the SQL from client-database.sql');
            console.log('4. Run the SQL commands to create the missing tables');
        }
        
        // Test some basic operations
        console.log('\n🧪 Testing basic operations...');
        
        if (existingTables.includes('users')) {
            const { data: userCount, error: userError } = await supabase
                .from('users')
                .select('id', { count: 'exact' });
            
            if (!userError) {
                console.log(`👥 Total users: ${userCount?.length || 0}`);
            }
        }
        
        if (existingTables.includes('doctors')) {
            const { data: doctorCount, error: doctorError } = await supabase
                .from('doctors')
                .select('id', { count: 'exact' });
            
            if (!doctorError) {
                console.log(`👨‍⚕️ Total doctors: ${doctorCount?.length || 0}`);
            }
        }
        
        if (existingTables.includes('appointments')) {
            const { data: appointmentCount, error: appointmentError } = await supabase
                .from('appointments')
                .select('id', { count: 'exact' });
            
            if (!appointmentError) {
                console.log(`📅 Total appointments: ${appointmentCount?.length || 0}`);
            }
        }
        
        console.log('\n🎉 Database setup check completed!');
        
        return {
            existingTables,
            missingTables,
            isReady: missingTables.length === 0 || 
                     (existingTables.includes('users') && 
                      existingTables.includes('doctors') && 
                      existingTables.includes('appointments'))
        };
        
    } catch (error) {
        console.error('❌ Setup error:', error.message);
        return { existingTables: [], missingTables: [], isReady: false };
    }
}

// Function to create sample data for testing
async function createSampleData() {
    try {
        console.log('📝 Creating sample data...');
        
        // Check if we already have users
        const { data: existingUsers, error: userError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (userError) {
            console.log('❌ Cannot create sample data - users table not accessible');
            return;
        }
        
        if (existingUsers && existingUsers.length > 0) {
            console.log('ℹ️  Sample data already exists');
            return;
        }
        
        // Create a sample user
        const { data: newUser, error: createUserError } = await supabase
            .from('users')
            .insert([
                {
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john.doe@example.com',
                    mobile: '+1234567890',
                    password: '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa' // 'password123'
                }
            ])
            .select();
        
        if (createUserError) {
            console.log('❌ Error creating sample user:', createUserError.message);
        } else {
            console.log('✅ Sample user created successfully');
        }
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error.message);
    }
}

// Main execution
async function main() {
    const result = await setupDatabase();
    
    if (result.isReady) {
        console.log('\n🎉 Your database is ready for the client dashboard!');
        
        // Optionally create sample data
        // await createSampleData();
    } else {
        console.log('\n⚠️  Database setup needs attention. Please create the missing tables.');
        
        console.log('\n📖 Instructions:');
        console.log('1. Open your Supabase dashboard: https://app.supabase.com/');
        console.log('2. Go to your project: https://app.supabase.com/project/ffajyjqtidprerlmebvf');
        console.log('3. Navigate to SQL Editor');
        console.log('4. Create a new query');
        console.log('5. Copy the contents of client-database.sql');
        console.log('6. Paste and run the SQL');
        console.log('7. Re-run this script to verify');
    }
}

if (require.main === module) {
    main();
}

module.exports = { setupDatabase, createSampleData };
