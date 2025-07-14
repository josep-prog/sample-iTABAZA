console.log("🔍 Diagnosing Appointment Booking Issues...\n");

// Test 1: Check if all required modules can be imported
console.log("📦 Test 1: Checking module imports...");
try {
  const { AppointmentModel } = require('./Backend/models/appointment.model');
  const { DoctorModel } = require('./Backend/models/doctor.model');
  const { UserModel } = require('./Backend/models/user.model');
  console.log("✅ All models imported successfully");
} catch (error) {
  console.log("❌ Module import failed:", error.message);
}

// Test 2: Check database connection
console.log("\n🔌 Test 2: Checking database connection...");
async function testDatabaseConnection() {
  try {
    const { supabase } = require('./Backend/config/db');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.log("❌ Database connection failed:", error.message);
    return false;
  }
}

// Test 3: Check if appointment table has required columns
console.log("\n📋 Test 3: Checking appointment table structure...");
async function testAppointmentTableStructure() {
  try {
    const { supabase } = require('./Backend/config/db');
    
    // Try to insert a test appointment with all new fields
    const testAppointment = {
      patient_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      doctor_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      patient_first_name: 'Test Patient',
      doc_first_name: 'Test Doctor',
      age_of_patient: 30,
      gender: 'male',
      address: 'Test Address',
      problem_description: 'Test Problem',
      appointment_date: '2025-07-02',
      appointment_time: '10:00',
      consultation_type: 'in-person',
      symptoms: ['test'],
      medical_history: 'None',
      medications: 'None',
      payment_status: false,
      payment_transaction_id: 'TEST123',
      payment_simcard_holder: 'Test Holder',
      payment_phone_number: '+250123456789',
      payment_method: 'mobile-money',
      payment_amount: 5000,
      payment_currency: 'RWF',
      patient_email: 'test@test.com',
      patient_phone: '+250123456789'
    };
    
    console.log("🧪 Attempting to insert test appointment...");
    const { data, error } = await supabase
      .from('appointments')
      .insert([testAppointment])
      .select();
    
    if (error) {
      console.log("❌ Appointment table structure test failed:");
      console.log("Error details:", error.message);
      console.log("Error hint:", error.hint || 'No hint provided');
      
      // Check which columns might be missing
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log("🔧 Suggested fix: Run the enhanced-appointment-schema.sql file to add missing columns");
      }
      return false;
    } else {
      console.log("✅ Appointment table structure is correct");
      // Clean up test data
      await supabase.from('appointments').delete().eq('id', data[0].id);
      console.log("🧹 Test data cleaned up");
      return true;
    }
  } catch (error) {
    console.log("❌ Appointment table test failed:", error.message);
    return false;
  }
}

// Test 4: Check if required users and doctors exist
console.log("\n👥 Test 4: Checking for test users and doctors...");
async function testUsersAndDoctors() {
  try {
    const { supabase } = require('./Backend/config/db');
    
    // Check users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, first_name, email')
      .limit(1);
    
    if (userError) throw userError;
    
    if (users.length === 0) {
      console.log("⚠️  No users found in database. You need at least one user to test appointment booking.");
      return false;
    } else {
      console.log(`✅ Found ${users.length} user(s). Test user: ${users[0].first_name} (${users[0].email})`);
    }
    
    // Check doctors
    const { data: doctors, error: doctorError } = await supabase
      .from('doctors')
      .select('id, doctor_name, is_available')
      .limit(1);
    
    if (doctorError) throw doctorError;
    
    if (doctors.length === 0) {
      console.log("⚠️  No doctors found in database. You need at least one doctor to test appointment booking.");
      return false;
    } else {
      console.log(`✅ Found ${doctors.length} doctor(s). Test doctor: ${doctors[0].doctor_name} (Available: ${doctors[0].is_available})`);
    }
    
    return { user: users[0], doctor: doctors[0] };
  } catch (error) {
    console.log("❌ Users/Doctors check failed:", error.message);
    return false;
  }
}

// Test 5: Test actual appointment creation
console.log("\n📅 Test 5: Testing appointment creation...");
async function testAppointmentCreation(userData, doctorData) {
  try {
    const { AppointmentModel } = require('./Backend/models/appointment.model');
    
    const appointmentData = {
      patient_id: userData.id,
      doctor_id: doctorData.id,
      patient_first_name: userData.first_name,
      doc_first_name: doctorData.doctor_name,
      age_of_patient: 30,
      gender: 'male',
      address: 'Test Address',
      problem_description: 'Diagnostic Test',
      appointment_date: '2025-07-02',
      appointment_time: '10:00',
      consultation_type: 'in-person',
      symptoms: ['test'],
      medical_history: 'None',
      medications: 'None',
      payment_status: true,
      payment_transaction_id: 'DIAG123456',
      payment_simcard_holder: 'Test Holder',
      payment_phone_number: '+250123456789',
      payment_method: 'mobile-money',
      payment_amount: 5000,
      payment_currency: 'RWF',
      patient_email: userData.email,
      patient_phone: '+250123456789'
    };
    
    console.log("🧪 Creating test appointment...");
    const createdAppointment = await AppointmentModel.create(appointmentData);
    
    if (createdAppointment && createdAppointment.id) {
      console.log("✅ Appointment created successfully!");
      console.log("📋 Appointment ID:", createdAppointment.id);
      console.log("💳 Payment Status:", createdAppointment.payment_status);
      console.log("🗓️  Appointment Date:", createdAppointment.appointment_date);
      
      // Clean up test appointment
      await AppointmentModel.delete(createdAppointment.id);
      console.log("🧹 Test appointment cleaned up");
      
      return true;
    } else {
      console.log("❌ Appointment creation failed - no data returned");
      return false;
    }
  } catch (error) {
    console.log("❌ Appointment creation failed:", error.message);
    console.log("Error details:", error);
    return false;
  }
}

// Run all tests
async function runDiagnostics() {
  console.log("🚀 Starting comprehensive diagnostics...\n");
  
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log("\n❌ Cannot proceed without database connection. Please check your .env file and Supabase configuration.");
    return;
  }
  
  const tableStructureOk = await testAppointmentTableStructure();
  if (!tableStructureOk) {
    console.log("\n❌ Appointment table structure issues detected. Please run the enhanced-appointment-schema.sql file.");
    return;
  }
  
  const testData = await testUsersAndDoctors();
  if (!testData) {
    console.log("\n❌ Missing test data. Please ensure you have at least one user and one doctor in your database.");
    return;
  }
  
  const appointmentCreated = await testAppointmentCreation(testData.user, testData.doctor);
  if (!appointmentCreated) {
    console.log("\n❌ Appointment creation failed. Check the error details above.");
    return;
  }
  
  console.log("\n🎉 ALL TESTS PASSED! The appointment booking system should work correctly.");
  console.log("\n💡 If you're still experiencing issues:");
  console.log("   1. Make sure your frontend is calling the correct API endpoints");
  console.log("   2. Ensure users are properly authenticated (valid JWT token)");
  console.log("   3. Check that the frontend sends all required fields");
  console.log("   4. Verify the server is running on the correct port (8080)");
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error("💥 Diagnostic script failed:", error);
});
