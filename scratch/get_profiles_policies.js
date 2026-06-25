import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'profiles' });
  if (error) {
    // If get_policies RPC doesn't exist, we can try running a custom SELECT if possible, 
    // or just check if we can read profiles table data.
    console.log('Error calling get_policies RPC:', error.message);
    
    console.log('Attempting to fetch a profile directly to test read access...');
    const { data: profiles, error: selectError } = await supabase.from('profiles').select('*').limit(5);
    if (selectError) {
      console.error('Select error:', selectError.message);
    } else {
      console.log('Successfully fetched profiles:', profiles);
    }
  } else {
    console.log('Policies for profiles:', data);
  }
}

run();
