import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myhcoffvavrilbteaqfe.supabase.co';
const supabaseAnonKey = 'sb_publishable_2E0yXpHPL95iJGr6ru7Dqg_Sy2W57yB';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function runDiagnosis() {
  const email = `test_expense_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  
  console.log(`1. Signing up test user: ${email}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test Expense User',
        phone_number: '1234567890',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        pincode: '123456',
        preferred_currency: 'INR'
      }
    }
  });

  if (signUpError) {
    console.error('SignUp Error:', signUpError);
    return;
  }

  const user = signUpData.user;
  if (!user) {
    console.error('No user object returned from signUp');
    return;
  }

  console.log(`User created. ID: ${user.id}`);

  // Wait a bit for triggers to finish
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('2. Querying profile...');
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileErr) {
    console.error('Error fetching profile:', profileErr);
  } else {
    console.log('Profile found:', profile);
  }

  console.log('3. Querying workspaces...');
  const { data: workspaces, error: workspaceErr } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id);

  if (workspaceErr) {
    console.error('Error fetching workspaces:', workspaceErr);
  } else {
    console.log('Workspaces found:', workspaces);
  }

  const workspace = workspaces && workspaces[0];
  if (!workspace) {
    console.error('No workspace found for test user!');
    return;
  }

  console.log('4. Querying categories for workspace:', workspace.id);
  const { data: categories, error: categoryErr } = await supabase
    .from('categories')
    .select('*')
    .eq('workspace_id', workspace.id);

  if (categoryErr) {
    console.error('Error fetching categories:', categoryErr);
  } else {
    console.log(`Found ${categories?.length || 0} categories.`);
  }

  const category = categories && categories[0];
  if (!category) {
    console.error('No categories found. Seeding is required or failed.');
    return;
  }

  // 5. Build and log the exact expense insert payload
  const payload = {
    workspace_id: workspace.id,
    user_id: user.id,
    category_id: category.id,
    title: 'Test Diagnostic Expense',
    notes: 'Testing RLS and constraints',
    amount: 150.00,
    currency_code: 'INR',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    expense_scope: 'personal'
  };

  console.log('5. Expense Payload to insert:', payload);

  console.log('6. Attempting to insert expense...');
  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .insert(payload)
    .select();

  if (expenseError) {
    console.error('❌ Expense Insertion Failed!');
    console.error('Error Code:', expenseError.code);
    console.error('Error Message:', expenseError.message);
    console.error('Error Details:', expenseError.details);
    console.error('Error Hint:', expenseError.hint);
  } else {
    console.log('✅ Expense Inserted Successfully!', expenseData);
  }
}

runDiagnosis().catch(err => {
  console.error('Diagnosis uncaught exception:', err);
});
