import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const testUserId = '00000000-0000-0000-0000-000000000000'; // We will use a mock or any valid user id if we find one

async function run() {
  console.log('Sending diagnostic request to local Express server at http://localhost:3001/api/ai/chat...');
  try {
    const response = await axios.post('http://localhost:3001/api/ai/chat', {
      userId: testUserId,
      message: 'Hello, this is a diagnostic check.',
      history: []
    });
    console.log('Server response status:', response.status);
    console.log('Server response body:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Server responded with an error status:', error.response.status);
      console.error('Error body:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response received from server. Is the server running on port 3001? Error:', error.message);
    } else {
      console.error('❌ Error configuring request:', error.message);
    }
  }
}

run();
