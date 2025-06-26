const fetch = require('node-fetch');

// Test the moderator API endpoint
async function testModeratorApi() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing moderator API endpoint...');
    
    // Test with missing parameters
    const response1 = await fetch(`${baseUrl}/api/moderator/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required parameters
      }),
    });
    
    const result1 = await response1.json();
    console.log('Test 1 - Missing parameters:', result1);
    
    // Test with invalid action
    const response2 = await fetch(`${baseUrl}/api/moderator/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: 'test-event-id',
        action: 'invalid-action',
        userId: 'test-user-id'
      }),
    });
    
    const result2 = await response2.json();
    console.log('Test 2 - Invalid action:', result2);
    
    // Test with valid parameters (will fail at auth check, but should reach that point)
    const response3 = await fetch(`${baseUrl}/api/moderator/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: 'test-event-id',
        action: 'approve',
        userId: 'test-user-id'
      }),
    });
    
    const result3 = await response3.json();
    console.log('Test 3 - Valid structure (should fail at auth):', result3);
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

if (require.main === module) {
  testModeratorApi();
}
