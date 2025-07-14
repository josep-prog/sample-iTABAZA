const axios = require('axios');

// Base URL for your backend
const BASE_URL = 'http://localhost:8080';

// Test data
const testDoctor = {
    first_name: 'John',
    last_name: 'TestDoctor',
    email: 'test.doctor@example.com',
    phone: '555-1234',
    specialty: 'Cardiology',
    password: 'SecurePassword123!'
};

// Test functions
async function testDoctorCreation() {
    try {
        console.log('🧪 Testing doctor account creation...');
        
        const response = await axios.post(`${BASE_URL}/doctor/addDoctor`, testDoctor);
        
        if (response.status === 201) {
            console.log('✅ Doctor creation successful!');
            console.log('Response:', response.data);
            return true;
        } else {
            console.log('❌ Doctor creation failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Doctor creation error:', error.response?.data || error.message);
        return false;
    }
}

async function testDoctorLogin() {
    try {
        console.log('🧪 Testing doctor login...');
        
        const loginData = {
            email: testDoctor.email,
            password: testDoctor.password
        };
        
        const response = await axios.post(`${BASE_URL}/doctor/login`, loginData);
        
        if (response.status === 200) {
            console.log('✅ Doctor login successful!');
            console.log('Response:', response.data);
            return true;
        } else {
            console.log('❌ Doctor login failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Doctor login error:', error.response?.data || error.message);
        return false;
    }
}

async function testWrongPassword() {
    try {
        console.log('🧪 Testing login with wrong password...');
        
        const loginData = {
            email: testDoctor.email,
            password: 'WrongPassword123!'
        };
        
        const response = await axios.post(`${BASE_URL}/doctor/login`, loginData);
        
        // This should fail
        console.log('❌ Login with wrong password should have failed but succeeded');
        return false;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Login with wrong password correctly rejected');
            return true;
        } else {
            console.log('❌ Unexpected error:', error.response?.data || error.message);
            return false;
        }
    }
}

async function testMissingPassword() {
    try {
        console.log('🧪 Testing doctor creation without password...');
        
        const doctorWithoutPassword = {
            first_name: 'Jane',
            last_name: 'TestDoctor2',
            email: 'test.doctor2@example.com',
            phone: '555-5678',
            specialty: 'Neurology'
            // No password field
        };
        
        const response = await axios.post(`${BASE_URL}/doctor/addDoctor`, doctorWithoutPassword);
        
        // This should fail
        console.log('❌ Doctor creation without password should have failed but succeeded');
        return false;
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Doctor creation without password correctly rejected');
            return true;
        } else {
            console.log('❌ Unexpected error:', error.response?.data || error.message);
            return false;
        }
    }
}

async function runAllTests() {
    console.log('🚀 Starting Doctor Authentication Tests\n');
    
    const results = {
        creation: await testDoctorCreation(),
        login: await testDoctorLogin(),
        wrongPassword: await testWrongPassword(),
        missingPassword: await testMissingPassword()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log('- Doctor Creation:', results.creation ? '✅ PASS' : '❌ FAIL');
    console.log('- Doctor Login:', results.login ? '✅ PASS' : '❌ FAIL');
    console.log('- Wrong Password Rejection:', results.wrongPassword ? '✅ PASS' : '❌ FAIL');
    console.log('- Missing Password Rejection:', results.missingPassword ? '✅ PASS' : '❌ FAIL');
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🏆 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Doctor authentication is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please check the implementation.');
    }
}

// Run the tests
runAllTests().catch(console.error);
