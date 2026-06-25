import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectDb() {
  console.log('Querying family members and nested profiles...');
  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('*, profile:profiles(*)');

  if (membersError) {
    console.error('❌ family_members query error:', membersError);
  } else {
    console.log('✅ family_members query result:', JSON.stringify(members, null, 2));
  }

  console.log('Querying all profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');

  if (profilesError) {
    console.error('❌ profiles query error:', profilesError);
  } else {
    console.log('✅ profiles query result:', JSON.stringify(profiles, null, 2));
  }
}

inspectDb();
