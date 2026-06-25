import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const testUserId = '00000000-0000-0000-0000-000000000000';

async function testEndpoint(name: string, pathUrl: string, payload: any) {
  console.log(`\nTesting endpoint: ${name} (${pathUrl})...`);
  try {
    const response = await axios.post(`http://localhost:3001${pathUrl}`, payload);
    console.log(`✅ ${name} succeeded with status ${response.status}`);
    console.log(`Response preview:`, JSON.stringify(response.data).substring(0, 150) + '...');
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ ${name} failed with status ${error.response.status}`);
      console.error(`Error body:`, error.response.data);
    } else {
      console.error(`❌ ${name} failed with request error:`, error.message);
    }
  }
}

async function runAll() {
  // 1. Chat
  await testEndpoint('AI Chat', '/api/ai/chat', {
    userId: testUserId,
    message: 'What is my daily average spending?',
    history: []
  });

  // 2. Predict Category
  await testEndpoint('Predict Category', '/api/ai/predict-category', {
    userId: testUserId,
    merchant: 'Uber',
    title: 'Ride to office',
    notes: 'business expense',
    amount: 350,
    categories: [
      { id: '1', name: 'Transport' },
      { id: '2', name: 'Food' }
    ]
  });

  // 3. Explain Expense
  await testEndpoint('Explain Expense', '/api/ai/explain-expense', {
    userId: testUserId,
    title: 'Uber Ride',
    amount: 350,
    categoryName: 'Transport',
    notes: 'Ride to office',
    merchant: 'Uber'
  });

  // 4. Budget Recommendation
  await testEndpoint('Budget Recommendation', '/api/ai/budget-recommendation', {
    userId: testUserId
  });

  // 5. Monthly Insights
  await testEndpoint('Monthly Insights', '/api/ai/monthly-insights', {
    userId: testUserId,
    month: 6,
    year: 2026
  });

  // 6. Anomalies
  await testEndpoint('Anomalies Check', '/api/ai/anomalies', {
    userId: testUserId,
    amount: 15000,
    categoryName: 'Food',
    merchant: 'Restaurant',
    paymentMethod: 'card'
  });

  // 7. Merchant Alias Normalization
  await testEndpoint('Merchant Alias Normalization', '/api/ai/merchant', {
    userId: testUserId,
    rawName: 'Starbucks Coffee Corp'
  });
}

runAll();
