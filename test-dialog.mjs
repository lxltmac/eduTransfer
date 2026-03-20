const fetch = require('node-fetch');

async function testAPI() {
  console.log('🧪 Testing ConfirmDialog functionality...');
  
  // Test 1: Check if frontend server is running
  try {
    const res = await fetch('http://localhost:5173');
    console.log('✅ Frontend server running:', res.status);
  } catch (e) {
    console.log('❌ Frontend server not running');
  }
  
  // Test 2: Check if backend API is running
  try {
    const res = await fetch('http://localhost:3000/api/settings');
    console.log('✅ Backend API running:', res.status);
  } catch (e) {
    console.log('❌ Backend API not running');
  }
  
  console.log('Tests complete. Please open browser and test manually.');
}

testAPI();
