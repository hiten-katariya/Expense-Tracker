import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('budgets').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in budgets:', Object.keys(data[0]));
  } else {
    // Select from information_schema if table is empty
    console.log('Table budgets is empty, checking columns...');
    const { data: cols, error: colErr } = await supabase.rpc('get_columns', { table_name: 'budgets' });
    console.log('rpc get_columns:', { cols, colErr });
  }
}

run();
