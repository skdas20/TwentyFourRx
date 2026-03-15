const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'courier@24rx.in',
        password: 'courier123'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.access_token) {
      console.log('\n✅ Login successful!');
      console.log('Token:', data.access_token);
      
      // Test the courier/my endpoint
      console.log('\n--- Testing courier/my endpoint ---');
      const deliveriesResponse = await fetch('http://localhost:8080/api/v1/delivery-requests/courier/my', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      const deliveriesData = await deliveriesResponse.json();
      console.log('Deliveries Status:', deliveriesResponse.status);
      console.log('Deliveries Response:', JSON.stringify(deliveriesData, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
