// Using built-in fetch

const supabaseUrl = 'https://myhcoffvavrilbteaqfe.supabase.co';
const supabaseAnonKey = 'sb_publishable_2E0yXpHPL95iJGr6ru7Dqg_Sy2W57yB';

async function fetchSchema() {
  console.log('Fetching OpenAPI schema from Supabase PostgREST...');
  const res = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  });

  const schema = await res.json();
  
  console.log('Tables exposed:');
  console.log(Object.keys(schema.paths || {}));
  
  if (schema.definitions && schema.definitions.expenses) {
    console.log('\nExpenses definition:');
    console.log(JSON.stringify(schema.definitions.expenses, null, 2));
  } else {
    console.log('\nExpenses definition not found in schema.');
  }

  // Also print all RPC functions (paths starting with /rpc/)
  const rpcs = Object.keys(schema.paths || {}).filter(p => p.startsWith('/rpc/'));
  console.log('\nRPC Functions exposed:');
  console.log(rpcs);
}

fetchSchema().catch(console.error);
